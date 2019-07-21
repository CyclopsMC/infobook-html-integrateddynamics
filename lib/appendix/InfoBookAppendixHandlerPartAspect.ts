import {
  HtmlInfoBookSerializer,
  IFileWriter,
  IInfoAppendix,
  IInfoBookAppendixHandler,
  ISerializeContext,
  ResourceHandler,
} from "cyclops-infobook-html";
import * as fs from "fs";
import {join} from "path";
import {compileTemplate} from "pug";
import {InfoBookAppendixHandlerAspect} from "./InfoBookAppendixHandlerAspect";
import {IValueType} from "./InfoBookAppendixHandlerOperator";

/**
 * Handles aspect appendices.
 */
export class InfoBookAppendixHandlerPartAspect implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly aspectHandler: InfoBookAppendixHandlerAspect;
  private readonly registryPartAspect: {[partName: string]: string[]};
  private readonly registryAspect: {[aspectName: string]: IAspect};

  constructor(resourceHandler: ResourceHandler, registriesPath: string, aspectHandler: InfoBookAppendixHandlerAspect) {
    this.resourceHandler = resourceHandler;
    this.aspectHandler = aspectHandler;

    this.registryPartAspect = JSON.parse(
      fs.readFileSync(join(registriesPath, 'part_aspect.json'), "utf8"));
    this.registryAspect = JSON.parse(
      fs.readFileSync(join(registriesPath, 'aspect.json'), "utf8"));
  }

  public createAppendix(data: any): IInfoAppendix {
    const id = `parttype.parttypes.integrateddynamics.${data._}.name`;
    const partAspects = this.registryPartAspect[id];
    if (!partAspects) {
      throw new Error(`Could not find a part with aspects for id ${id}`);
    }
    const aspects = partAspects.map((aspectName: string) => this.registryAspect[aspectName]);

    return {
      getName: (context) => this.resourceHandler.getTranslation(
        'aspect.aspects.integrateddynamics.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        return aspects.map((aspect) => this.aspectHandler.serializeAspect(aspect, context, serializer)).join('<hr />');
      },
    };
  }

}

export type IAspect = IAspectRead | IAspectWrite;

export interface IAspectRead {
  name: string;
  description: string;
  type: 'read';
  output: IValueType;
  properties: string[];
}

export interface IAspectWrite {
  name: string;
  description: string;
  type: 'write';
  input: IValueType;
  properties: string[];
}
