import * as _events from "./events";
import * as _logger from "./logger";
import * as _resource from "./resource";
import * as _service from "./service";

export type Events<T, C> = _events.Events<T, C>;
export type Resource<T, O, C> = _resource.IResource<T, O, C>;
export type Service<O, C> = _service.IService<O, C>;

export const events = _events.events;
export const resource = _resource.resource;
export const service = _service.service;
export const logger = _logger.logger;
