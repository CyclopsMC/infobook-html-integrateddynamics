import {ResourceHandler} from "cyclops-infobook-html";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./InfoBookAppendixHandlerSqueezerRecipe";

/**
 * Handles mechanical squeezer recipe appendices.
 */
export class InfoBookAppendixHandlerMechanicalSqueezerRecipe extends InfoBookAppendixHandlerSqueezerRecipe {

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super(resourceHandler, registriesPath, recipeOverrides, 'integrateddynamics:mechanical_squeezer');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.integrateddynamics.mechanical_squeezer';
  }

}
