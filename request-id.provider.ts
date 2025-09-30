import { REQUEST } from "@nestjs/core";
import { Injectable, Scope, Inject } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestIdProvider {
  constructor(@Inject(REQUEST) private readonly request) { }

  getRequestId(): string {
    return this.request.requestId;
  }
}
