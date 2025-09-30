import { Logger } from '@nestjs/common';
import { RequestIdProvider } from "./request-id.provider";
import * as _ from 'lodash';

type MaskedObject = { [key: string]: any };

export class AppLogger extends Logger {

  propertiesToMask = ["password", "Password", "UserKey"];

  constructor(private readonly requestIdProvider: RequestIdProvider) {
    super();
  }

  /**
   * Formats an error message with general error properties and, if applicable, Axios-specific details.
   * @param {Error} msg - The error message object, which may include Axios-specific properties.
   * @returns {string} - A formatted error message string with relevant details.
   */
  private formatErrorMessage(msg: Error): string {
    const err: any = msg;

    // Define an array of properties to capture general error details
    const properties = [
      { label: "Message", value: err.message },
      { label: "Stack", value: err.stack },
      { label: "DriveError", value: err.driverError },
      { label: "Query", value: err.query },
      { label: "Parameters", value: err.parameters },
      { label: "Hint", value: err.hint },
      { label: "Constraint", value: err.constraint },
      { label: "Detail", value: err.detail },
      { label: "Code", value: err.code },
      { label: "Table", value: err.table },
      { label: "Column", value: err.column },
      { label: "Severity", value: err.severity },
      { label: "Routine", value: err.routine },
      { label: "Schema", value: err.schema },
      {
        label: "Err Response Message",
        value: err?.response?.data?.message && this.logObject(err.response.data.message)
      }
    ];

    // Add Axios-specific properties if available
    if (err.isAxiosError && err.config) {
      properties.push(
        { label: "Request URL", value: err?.config?.url || "" },
        { label: "Request Method", value: err?.config?.method || "" },
        { label: "Request Headers", value: this.logObject(err?.config?.headers || {}) },
        { label: "Request Data", value: this.logObject(err?.config?.data || {}) },
        { label: "Response Status", value: err.response?.status || "" },
        { label: "Response Data", value: this.logObject(err?.response?.data || {}) }
      );
    }

    // Construct the error message by including only properties with valid values
    return properties
      .filter(prop => prop.value)  // Only include properties with valid values
      .map(prop => `${prop.label}: ${prop.value}`)  // Format each entry
      .join("\n\n");  // Join with new lines
  }

  private formatMessage(messages: any[], requestId: string): string {
    try {
      const logMessage = messages
        .map((msg) => {
          if (msg instanceof Error) {
            return `[Error] ${this.formatErrorMessage(msg)}`;
          } else if (typeof msg === 'string' || typeof msg === 'number' || typeof msg === 'boolean' || msg === null) {
            return msg;
          } else {
            // based on env allow object printing, this is due to avoid memotry issues to print bigger objects
            if (process.env.LOGS_LOG_OBJ === "true") {
              return this.logObject(msg);
            } else {
              return "";
            }
          }
        })
        .join(' ');
      return `[RequestID: ${requestId}] ${logMessage}`;
    } catch (err) {
      return `[RequestID: ${requestId}] Unable to format error/log message`;
    }
  }

  log(...messages: any[]) {
    const requestId = this.requestIdProvider.getRequestId();
    super.log(this.formatMessage(messages, requestId));
  }

  error(...messages: any[]) {
    const requestId = this.requestIdProvider.getRequestId();
    super.error(this.formatMessage(messages, requestId));
  }

  warn(...messages: any[]) {
    const requestId = this.requestIdProvider.getRequestId();
    super.warn(this.formatMessage(messages, requestId));
  }

  debug(...messages: any[]) {
    const requestId = this.requestIdProvider.getRequestId();
    super.debug(this.formatMessage(messages, requestId));
  }

  verbose(...messages: any[]) {
    const requestId = this.requestIdProvider.getRequestId();
    super.verbose(this.formatMessage(messages, requestId));
  }

  shouldMaskProperty(path: string[], propertiesToMask: string[]): boolean {
    return propertiesToMask.includes(path[path.length - 1]);
  }

  maskObject(obj: any, propertiesToMask: string[], maskValue = '****'): any {
    // Deep clone to avoid mutating the original object
    const clonedObj = _.cloneDeep(obj);

    // Iterate over the properties to mask
    propertiesToMask.forEach(path => {
      if (_.has(clonedObj, path)) {
        // Check if the value at the path is a string, then mask it
        const value = _.get(clonedObj, path);
        if (typeof value === 'string') {
          _.set(clonedObj, path, maskValue);
        }
      }
    });

    return clonedObj;
  }

  logObject(obj: MaskedObject) {
    return JSON.stringify(this.maskObject(obj, this.propertiesToMask));
  }
}
