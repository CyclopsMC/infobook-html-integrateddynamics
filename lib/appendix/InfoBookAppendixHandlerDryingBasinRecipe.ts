import {
  HtmlInfoBookSerializer,
  IFileWriter,
  IFluid,
  IInfoAppendix,
  IInfoBookAppendixHandler,
  IItem,
  ISerializeContext,
  ResourceHandler,
} from "cyclops-infobook-html";
import * as fs from "fs";
import {join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";

/**
 * Handles drying basin recipe appendices.
 */
export class InfoBookAppendixHandlerDryingBasinRecipe implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateRecipe: compileTemplate;
  private readonly registry: IRecipeDryingBasin[];
  private readonly registryTagged: {[tag: string]: IRecipeDryingBasin[]};
  private readonly machineName: string;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, machineName: string = 'drying_basin') {
    this.machineName = machineName;
    this.resourceHandler = resourceHandler;
    this.templateRecipe = compilePug(__dirname + '/../../template/appendix/drying_basin_recipe.pug');

    const registry: IRecipeRegistryDryingBasin = JSON.parse(
      fs.readFileSync(join(registriesPath, this.machineName + '_recipe.json'), "utf8"));
    this.registry = [];
    this.registryTagged = {};
    for (const recipe of registry.recipes) {
      this.registry.push(recipe);
      for (const tag of recipe.tags) {
        let recipes = this.registryTagged[tag];
        if (!recipes) {
          recipes = this.registryTagged[tag] = [];
        }
        recipes.push(recipe);
      }
    }
  }

  public createAppendix(data: any): IInfoAppendix {
    let recipes: IRecipeDryingBasin[] = [];
    let tag = data._;
    if (tag) {
      // Fetch all recipes with the given tag.
      tag = 'integrateddynamics:' + this.machineName + '_recipe:' + tag;
      recipes = this.registryTagged[tag];
      if (!recipes) {
        throw new Error(`Could not find any recipes for tag ${tag}`);
      }
    } else {
      // Fetch all recipes with the given recipe output.
      const item = data.item && data.item[0] ? data.item[0] : null;
      const fluid = data.fluid && data.fluid[0] ? data.fluid[0]._ || data.fluid[0] : null;
      const fluidAmount = data.fluid && data.fluid[0] && data.fluid[0].$ ? data.fluid[0].$.amount : null;

      // Match the expected output with all recipes
      for (const recipe of this.registry) {
        // Match item
        const foundItem = !item || recipe.output.item.item === item;

        // Match fluid
        let foundFluid = !fluid || (recipe.output.fluid && recipe.output.fluid.fluid === fluid);
        if (foundFluid && fluidAmount && recipe.output.fluid.amount !== parseInt(fluidAmount, 10)) {
          foundFluid = false;
        }

        if (foundItem && foundFluid) {
          recipes.push(recipe);
        }
      }
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation(
        'tile.blocks.integrateddynamics.' + this.machineName + '.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        return recipes.map((recipe) => this.serializeRecipe(recipe, context, fileWriter, serializer)).join('<hr />');
      },
    };
  }

  protected serializeRecipe(recipe: IRecipeDryingBasin, context: ISerializeContext,
                            fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) {
    // Input
    const inputItem = recipe.input.item.map((item) => serializer.createItemDisplay(this.resourceHandler,
      context.language, fileWriter, item, true));
    const inputFluid = recipe.input.fluid ? serializer.createFluidDisplay(this.resourceHandler,
      context.language, fileWriter, recipe.input.fluid, true) : null;
    const input = { item: inputItem, fluid: inputFluid };

    // Outputs
    const outputs = [];
    if (recipe.output.item) {
      outputs.push(serializer.createItemDisplay(this.resourceHandler,
        context.language, fileWriter, recipe.output.item, true));
    }
    if (recipe.output.fluid) {
      outputs.push(serializer.createFluidDisplay(this.resourceHandler,
        context.language, fileWriter, recipe.output.fluid, true));
    }

    const appendixIcon = serializer.createItemDisplay(this.resourceHandler,
      context.language, fileWriter, { item: 'integrateddynamics:' + this.machineName, data: 0 }, false);

    // Duration
    let duration = '';
    if (recipe.duration) {
      duration = (recipe.duration / 20) + 's';
    }

    return this.templateRecipe({ input, outputs, appendixIcon, duration });
  }

}

export interface IRecipeRegistryDryingBasin {
  recipes: IRecipeDryingBasin[];
}

export interface IRecipeDryingBasin {
  input: {
    item?: IItem[];
    fluid?: IFluid;
  };
  output: {
    item?: IItem;
    fluid?: IFluid;
  };
  tags: string[];
  duration?: number;
}
