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
 * Handles operator appendices.
 */
export class InfoBookAppendixHandlerOperator implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateOperator: compileTemplate;
  private readonly registry: {[name: string]: IOperator};

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    this.resourceHandler = resourceHandler;
    this.templateOperator = compilePug(__dirname + '/../../template/appendix/operator.pug');

    this.registry = JSON.parse(
      fs.readFileSync(join(registriesPath, 'operator.json'), "utf8"));
  }

  public static serializeValueType(valueType: IValueType, resourceHandler: ResourceHandler,
                                   context: ISerializeContext, serializer: HtmlInfoBookSerializer): string {
    return serializer.formatString(valueType.color + resourceHandler.getTranslation(valueType.name, context.language)
    + (valueType.color ? '§0' : ''));
  }

  public createAppendix(data: any): IInfoAppendix {
    const id = data._;
    const operator = this.registry[id];
    if (!operator) {
      throw new Error(`Could not find the operator with id ${id}`);
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation(
        'operator.operators.integrateddynamics.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        const name = this.resourceHandler.getTranslation(operator.name, context.language);
        let description = '';
        try {
          description = this.resourceHandler.getTranslation(operator.description, context.language);
        } catch (e) {
          // Ignore missing description translations
        }
        const symbol = operator.symbol;
        const inputs = operator.inputs.map((input) => InfoBookAppendixHandlerOperator.serializeValueType(
          input, this.resourceHandler, context, serializer));
        const output = InfoBookAppendixHandlerOperator.serializeValueType(
          operator.output, this.resourceHandler, context, serializer);
        return this.templateOperator({ name, description, symbol, inputs, output });
      },
    };
  }

}

export interface IOperator {
  name: string;
  description: string;
  symbol: string;
  output: IValueType;
  inputs: IValueType[];
}

export interface IValueType {
  name: string;
  color: string;
}
