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
import {InfoBookAppendixHandlerOperator, IValueType} from "./InfoBookAppendixHandlerOperator";

/**
 * Handles aspect appendices.
 */
export class InfoBookAppendixHandlerAspect implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateAspect: compileTemplate;
  private readonly registry: {[name: string]: IAspect};

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    this.resourceHandler = resourceHandler;
    this.templateAspect = compilePug(__dirname + '/../../template/appendix/aspect.pug');

    this.registry = JSON.parse(
      fs.readFileSync(join(registriesPath, 'aspect.json'), "utf8"));
  }

  public createAppendix(data: any): IInfoAppendix {
    const id = data._;
    const aspect = this.registry[id];
    if (!aspect) {
      throw new Error(`Could not find the aspect with id ${id}`);
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation(
        'aspect.integrateddynamics.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        return this.serializeAspect(aspect, context, serializer);
      },
    };
  }

  public serializeAspect(aspect: IAspect, context: ISerializeContext, serializer: HtmlInfoBookSerializer): string {
    const name = this.resourceHandler.getTranslation(aspect.name, context.language);
    const description = this.resourceHandler.getTranslation(aspect.description, context.language);
    const value = aspect.type === 'read'
      ? '<strong>' + this.resourceHandler.getTranslation('gui.integrateddynamics.output', context.language)
        .replace('%s', '') + '</strong>'
      + InfoBookAppendixHandlerOperator.serializeValueType(aspect.output, this.resourceHandler, context, serializer)
      : '<strong>' + this.resourceHandler.getTranslation('gui.integrateddynamics.input', context.language)
        .replace('%s', '') + '</strong>'
      + InfoBookAppendixHandlerOperator.serializeValueType(aspect.input, this.resourceHandler, context, serializer);
    const propertiesString = aspect.properties.length > 0 ? this.resourceHandler
      .getTranslation('gui.integrateddynamics.part.properties', context.language) : '';
    const properties = aspect.properties
      .map((property) => this.resourceHandler.getTranslation(property, context.language));
    return this.templateAspect({ name, description, value, properties, propertiesString });
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
