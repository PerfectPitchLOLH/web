import { db } from '@/server/lib/database'

import type {
  CreateCustomerDTO,
  CreateInvoiceDTO,
  CreateSubscriptionDTO,
  CustomerEntity,
  InvoiceEntity,
  SubscriptionEntity,
  SubscriptionPlanEntity,
  SubscriptionStatus,
  SubscriptionWithPlan,
  UpdateSubscriptionDTO,
} from './subscription.types'

export class SubscriptionRepository {
  async findSubscriptionByUserId(
    userId: string,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return subscription as SubscriptionEntity | null
  }

  async findSubscriptionWithPlan(
    userId: string,
  ): Promise<SubscriptionWithPlan | null> {
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return subscription as SubscriptionWithPlan | null
  }

  async findSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await db.subscription.findUnique({
      where: { stripeSubscriptionId },
    })

    return subscription as SubscriptionEntity | null
  }

  async createSubscription(
    data: CreateSubscriptionDTO,
  ): Promise<SubscriptionEntity> {
    const subscription = await db.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        canceledAt: data.canceledAt ?? null,
        trialStart: data.trialStart ?? null,
        trialEnd: data.trialEnd ?? null,
      },
    })

    return subscription as SubscriptionEntity
  }

  async updateSubscription(
    stripeSubscriptionId: string,
    data: UpdateSubscriptionDTO,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await db.subscription.update({
      where: { stripeSubscriptionId },
      data,
    })

    return subscription as SubscriptionEntity
  }

  async findAllPlans(): Promise<SubscriptionPlanEntity[]> {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    })

    return plans as SubscriptionPlanEntity[]
  }

  async findPlanById(planId: string): Promise<SubscriptionPlanEntity | null> {
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    })

    return plan as SubscriptionPlanEntity | null
  }

  async findPlanByStripeProductId(
    stripeProductId: string,
  ): Promise<SubscriptionPlanEntity | null> {
    const plan = await db.subscriptionPlan.findUnique({
      where: { stripeProductId },
    })

    return plan as SubscriptionPlanEntity | null
  }

  async findPlanByStripePriceId(
    stripePriceId: string,
  ): Promise<SubscriptionPlanEntity | null> {
    const plan = await db.subscriptionPlan.findUnique({
      where: { stripePriceId },
    })

    return plan as SubscriptionPlanEntity | null
  }

  async createOrUpdateCustomer(
    data: CreateCustomerDTO,
  ): Promise<CustomerEntity> {
    const customer = await db.customer.upsert({
      where: { userId: data.userId },
      update: {
        email: data.email,
        name: data.name ?? null,
        defaultPaymentMethod: data.defaultPaymentMethod ?? null,
      },
      create: {
        userId: data.userId,
        stripeCustomerId: data.stripeCustomerId,
        email: data.email,
        name: data.name ?? null,
        defaultPaymentMethod: data.defaultPaymentMethod ?? null,
      },
    })

    return customer as CustomerEntity
  }

  async findCustomerByUserId(userId: string): Promise<CustomerEntity | null> {
    const customer = await db.customer.findUnique({
      where: { userId },
    })

    return customer as CustomerEntity | null
  }

  async findCustomerByStripeId(
    stripeCustomerId: string,
  ): Promise<CustomerEntity | null> {
    const customer = await db.customer.findUnique({
      where: { stripeCustomerId },
    })

    return customer as CustomerEntity | null
  }

  async createInvoice(data: CreateInvoiceDTO): Promise<InvoiceEntity> {
    const invoice = await db.invoice.create({
      data: {
        userId: data.userId,
        stripeInvoiceId: data.stripeInvoiceId,
        amount: data.amount,
        currency: data.currency ?? 'eur',
        status: data.status,
        hostedInvoiceUrl: data.hostedInvoiceUrl ?? null,
        invoicePdf: data.invoicePdf ?? null,
        description: data.description ?? null,
        paidAt: data.paidAt ?? null,
      },
    })

    return invoice as InvoiceEntity
  }

  async findInvoicesByUserId(userId: string): Promise<InvoiceEntity[]> {
    const invoices = await db.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return invoices as InvoiceEntity[]
  }

  async updateInvoice(
    stripeInvoiceId: string,
    data: Partial<CreateInvoiceDTO>,
  ): Promise<InvoiceEntity | null> {
    const invoice = await db.invoice.update({
      where: { stripeInvoiceId },
      data,
    })

    return invoice as InvoiceEntity
  }

  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
    additionalData?: Partial<UpdateSubscriptionDTO>,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await db.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        status,
        ...additionalData,
      },
    })

    return subscription as SubscriptionEntity
  }
}
