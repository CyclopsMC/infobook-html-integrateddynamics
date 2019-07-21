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
 * Handles squeezer recipe appendices.
 */
export class InfoBookAppendixHandlerSqueezerRecipe implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateRecipe: compileTemplate;
  private readonly registry: IRecipeSqueezer[];
  private readonly registryTagged: {[tag: string]: IRecipeSqueezer[]};

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    this.resourceHandler = resourceHandler;
    this.templateRecipe = compilePug(__dirname + '/../../template/appendix/squeezer_recipe.pug');

    const registry: IRecipeRegistrySqueezer = JSON.parse(
      fs.readFileSync(join(registriesPath, 'squeezer_recipe.json'), "utf8"));
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
    let recipes: IRecipeSqueezer[] = [];
    const tag = data._;
    if (tag) {
      // Fetch all recipes with the given tag.
      recipes = this.registryTagged['integrateddynamics:squeezer_recipe:' + tag];
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
        let foundItem = false;

        // Match item
        if (item) {
          for (const outputItem of recipe.output.items) {
            if (outputItem.item === item) {
              foundItem = true;
              break;
            }
          }
        } else {
          foundItem = true;
        }

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
        'tile.blocks.integrateddynamics.squeezer.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        return recipes.map((recipe) => this.serializeRecipe(recipe, context, fileWriter, serializer)).join('');
      },
    };
  }

  protected serializeRecipe(recipe: IRecipeSqueezer, context: ISerializeContext,
                            fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) {
    // Input
    const input = recipe.input.map((item) => serializer.createItemDisplay(this.resourceHandler,
      context.language, fileWriter, item, true));

    // Outputs
    const outputs = [];
    for (const item of recipe.output.items) {
      let annotation = '';
      if ((<any> item).chance < 1) {
        annotation = (<any> item).chance;
      }
      outputs.push(serializer.createItemDisplay(this.resourceHandler,
        context.language, fileWriter, item, true, annotation));
    }
    if (recipe.output.fluid) {
      outputs.push(serializer.createFluidDisplay(this.resourceHandler,
        context.language, fileWriter, recipe.output.fluid, true));
    }

    const appendixIcon = serializer.createItemDisplay(this.resourceHandler,
      context.language, fileWriter, { item: 'integrateddynamics:squeezer', data: 0 }, false);

    return this.templateRecipe({ input, outputs, appendixIcon });
  }

}

export interface IRecipeRegistrySqueezer {
  recipes: IRecipeSqueezer[];
}

export interface IRecipeSqueezer {
  input: IItem[];
  output: {
    items: IItem[];
    fluid?: IFluid;
  };
  tags: string[];
}
