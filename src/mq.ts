import * as _events from "./events";
import * as _logger from "./logger";
import * as _message from "./message";
import * as _resource from "./resource";
import * as _service from "./service";

export type Handler = _message.Handler;

export type Events<T, C, O> = _events.Events<T, C, O>;
export type Resource<T, U, C, TO, UO> = _resource.IResource<T, U, C, TO, UO>;
export type Service<T, C, O> = _service.IService<T, C, O>;

export const events = _events.events;
export const resource = _resource.resource;
export const service = _service.service;
export const logger = _logger.logger;
