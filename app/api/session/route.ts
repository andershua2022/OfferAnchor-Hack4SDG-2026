import { workspaceApi } from "../../../lib/server/workspace-api";
export const runtime="nodejs";
export const maxDuration=60;
export const dynamic="force-dynamic";
export const GET=workspaceApi.status;
export const POST=workspaceApi.login;
export const DELETE=workspaceApi.logout;
