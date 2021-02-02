import {
  HtmlInfoBookSerializer,
  IFileWriter,
  IFluid,
  IItem, InfoBookAppendixHandlerAbstractRecipe, IRecipe,
  ISerializeContext,
  ResourceHandler,
} from "cyclops-infobook-html";
import {compileFile as compilePug, compileTemplate} from "pug";

/**
 * Handles drying basin recipe appendices.
 */
export class InfoBookAppendixHandlerDryingBasinRecipe
  extends InfoBookAppendixHandlerAbstractRecipe<IRecipeDryingBasin> {

  private readonly templateRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any,
              id: string = 'integrateddynamics:drying_basin') {
    super(id, resourceHandler, registriesPath, recipeOverrides);
    this.templateRecipe = compilePug(__dirname + '/../../template/appendix/drying_basin_recipe.pug');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.integrateddynamics.drying_basin';
  }

  protected serializeRecipe(recipe: IRecipeDryingBasin, context: ISerializeContext,
                            fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): string {
    // Input
    const inputItem = recipe.input.item.map((item) => serializer.createItemDisplay(this.resourceHandler,
      context, fileWriter, item, true));
    const inputFluid = recipe.input.fluid ? serializer.createFluidDisplay(this.resourceHandler,
      context, fileWriter, recipe.input.fluid, true) : null;
    const input = { item: inputItem, fluid: inputFluid };

    // Outputs
    const outputs = [];
    if (recipe.output.item) {
      outputs.push(serializer.createItemDisplay(this.resourceHandler,
        context, fileWriter, recipe.output.item, true));
    }
    if (recipe.output.fluid) {
      outputs.push(serializer.createFluidDisplay(this.resourceHandler,
        context, fileWriter, recipe.output.fluid, true));
    }

    const appendixIcon = serializer.createItemDisplay(this.resourceHandler,
      context, fileWriter, { item: this.id }, false);

    // Duration
    let duration = '';
    if (recipe.duration) {
      duration = (recipe.duration / 20) + 's';
    }

    return this.templateRecipe({ input, outputs, appendixIcon, duration });
  }

}

export interface IRecipeDryingBasin extends IRecipe {
  input: {
    item?: IItem[];
    fluid?: IFluid;
  };
  output: {
    item?: IItem;
    fluid?: IFluid;
  };
  duration?: number;
}
