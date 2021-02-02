import {
  HtmlInfoBookSerializer,
  IFileWriter,
  IFluid,
  IInfoAppendix,
  IInfoBookAppendixHandler,
  IItem, InfoBookAppendixHandlerAbstractRecipe, IRecipe,
  ISerializeContext,
  ResourceHandler,
} from "cyclops-infobook-html";
import * as fs from "fs";
import {join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";

/**
 * Handles squeezer recipe appendices.
 */
export class InfoBookAppendixHandlerSqueezerRecipe extends InfoBookAppendixHandlerAbstractRecipe<IRecipeSqueezer> {

  private readonly templateRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any,
              id: string = 'integrateddynamics:squeezer') {
    super(id, resourceHandler, registriesPath, recipeOverrides);
    this.templateRecipe = compilePug(__dirname + '/../../template/appendix/squeezer_recipe.pug');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.integrateddynamics.squeezer';
  }

  protected serializeRecipe(recipe: IRecipeSqueezer, context: ISerializeContext,
                            fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) {
    // Input
    const input = recipe.input.map((item) => serializer.createItemDisplay(this.resourceHandler,
      context, fileWriter, item, true));

    // Outputs
    const outputs = [];
    for (const item of recipe.output.items) {
      let annotation = '';
      if ((<any> item).chance < 1) {
        annotation = (<any> item).chance;
      }
      outputs.push(serializer.createItemDisplay(this.resourceHandler,
        context, fileWriter, item, true, annotation));
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

export interface IRecipeSqueezer extends IRecipe {
  input: IItem[];
  output: {
    items: IItem[];
    fluid?: IFluid;
  };
  tags: string[];
  duration?: number;
}
