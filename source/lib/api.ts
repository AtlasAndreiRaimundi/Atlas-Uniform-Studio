import {ProductionService} from './production-service.mjs';
import {OrderTrackingService} from './order-tracking.mjs';
import { TemplateService } from './template-service.mjs';
import { INSTALLED_TEMPLATES } from './installed-templates.mjs';
import { WorkspaceService } from './workspace-service.mjs';
import { requireAdminUser, isAdminUser } from './admin-auth.mjs';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { AppError, ProjectService, MAX_REQUEST } from './project-service.mjs';
import {assertMutation,boundedJSON,boundedForm} from './request-security.mjs';
import {OrderTechnicalService} from './order-technical-service.mjs';
import {SimulatorService} from './simulator-service.mjs';
export function simulatorService(){return new SimulatorService(env.DB,env.BUCKET,new ProductionService(env.DB,env.BUCKET),service());}
export function orderTechnicalService(){return new OrderTechnicalService(env.DB,env.BUCKET,new ProductionService(env.DB,env.BUCKET),trackingService());}

export function trackingService(){return new OrderTrackingService(env.DB,env.BUCKET,new ProductionService(env.DB,env.BUCKET),env.ADMIN_USER_ID||'');}

export function service() {
  if (!env.DB || !env.BUCKET) throw new AppError(503, 'O estúdio está sendo preparado. Tente novamente em instantes.');
  return new ProjectService(env.DB, env.BUCKET, templateService());
}
export function templateService() {
  if (!env.DB || !env.BUCKET) throw new AppError(503, 'O armazenamento está sendo preparado.');
  return new TemplateService(env.DB, env.BUCKET, env.ADMIN_USER_ID || '', INSTALLED_TEMPLATES);
}
export function workspaceService(){return new WorkspaceService(env.DB,env.BUCKET,service(),templateService());}
export function isAdmin(user: any) { return isAdminUser(user, env.ADMIN_USER_ID); }
export async function adminAccount() { return requireAdminUser(await account(), env.ADMIN_USER_ID); }
export async function account() {
  const user = await getChatGPTUser();
  if (!user) throw new AppError(401, 'Entre na sua conta para continuar.');
  return user;
}
export async function mutation(request: Request) {
  assertMutation(request,MAX_REQUEST);
}
export async function jsonInput(request: Request) {
  return boundedJSON(request);
}
export const formInput=boundedForm;
export function result(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function handle(operation: () => Promise<Response>) {
  try { return await operation(); } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Project operation failed', error?.message);
    return result({ error: error instanceof AppError ? error.message : 'Não foi possível concluir. Tente novamente.' }, error instanceof AppError ? error.status : 500);
  }
}
export async function assetResponse(object: any) {
  if (object.redirect) return new Response(null, { status: 307, headers: { Location: object.redirect, 'Cache-Control': 'no-store' } });
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
}
