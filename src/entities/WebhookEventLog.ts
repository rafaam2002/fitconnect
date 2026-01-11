import { Entity, Enum, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from './BaseEntity';

export enum WebhookEventStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

@Entity()
export class WebhookEventLog extends BaseEntity {
  @Property({ length: 100 })
  @Index()
  stripeEventId!: string;

  @Property({ length: 100 })
  eventType!: string; // customer.created, invoice.paid, etc.

  @Enum(() => WebhookEventStatus)
  status: WebhookEventStatus = WebhookEventStatus.PENDING;

  @Property({ type: 'json' })
  payload!: any;

  @Property({ type: 'text', nullable: true })
  errorMessage?: string;

  @Property({ type: 'smallint', default: 0 })
  retryCount: number = 0;

  @Property({ type: 'datetime', nullable: true })
  processedAt?: Date;

  @Property({ type: 'datetime', nullable: true })
  lastAttemptAt?: Date;

  markAsProcessed(): void {
    this.status = WebhookEventStatus.PROCESSED;
    this.processedAt = new Date();
  }

  markAsFailed(errorMessage: string): void {
    this.status = WebhookEventStatus.FAILED;
    this.errorMessage = errorMessage;
    this.retryCount += 1;
  }

  markAsIgnored(): void {
    this.status = WebhookEventStatus.IGNORED;
    this.processedAt = new Date();
  }
}
