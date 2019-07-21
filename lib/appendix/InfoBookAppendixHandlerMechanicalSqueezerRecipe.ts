import {ResourceHandler} from "cyclops-infobook-html";
import {join} from "path";
import {compileTemplate} from "pug";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./InfoBookAppendixHandlerSqueezerRecipe";

/**
 * Handles mechanical squeezer recipe appendices.
 */
export class InfoBookAppendixHandlerMechanicalSqueezerRecipe extends InfoBookAppendixHandlerSqueezerRecipe {

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    super(resourceHandler, registriesPath, 'mechanical_squeezer');
  }

}
