import {ResourceHandler} from "cyclops-infobook-html";
import {join} from "path";
import {compileTemplate} from "pug";
import {InfoBookAppendixHandlerDryingBasinRecipe} from "./InfoBookAppendixHandlerDryingBasinRecipe";

/**
 * Handles mechanical drying basin recipe appendices.
 */
export class InfoBookAppendixHandlerMechanicalDryingBasinRecipe extends InfoBookAppendixHandlerDryingBasinRecipe {

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    super(resourceHandler, registriesPath, 'mechanical_drying_basin');
  }

}
