import {ResourceHandler} from "cyclops-infobook-html";
import {InfoBookAppendixHandlerDryingBasinRecipe} from "./InfoBookAppendixHandlerDryingBasinRecipe";

/**
 * Handles mechanical drying basin recipe appendices.
 */
export class InfoBookAppendixHandlerMechanicalDryingBasinRecipe extends InfoBookAppendixHandlerDryingBasinRecipe {

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super(resourceHandler, registriesPath, recipeOverrides, 'integrateddynamics:mechanical_drying_basin');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.integrateddynamics.mechanical_drying_basin';
  }

}
