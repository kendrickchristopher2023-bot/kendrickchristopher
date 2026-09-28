import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getProfileTool from "./tools/get-profile";
import getResumeTool from "./tools/get-resume";
import updateResumeTool from "./tools/update-resume";
import listMatchesTool from "./tools/list-matches";
import addMatchTool from "./tools/add-match";
import listApplicationsTool from "./tools/list-applications";
import addApplicationTool from "./tools/add-application";
import updateApplicationTool from "./tools/update-application";
import tailorResumeTool from "./tools/tailor-resume";
import coverLetterTool from "./tools/cover-letter";
import referralDmTool from "./tools/referral-dm";
import linkedinOptimizeTool from "./tools/linkedin-optimize";
import interviewStarTool from "./tools/interview-star";
import followupTool from "./tools/followup";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "excel-ai-resume",
  title: "Excel AI Resume",
  version: "0.1.0",
  instructions:
    "Tools to read and improve the signed-in user's resume, tailor it to job descriptions, generate cover letters, draft referral outreach and follow-up emails, prep STAR interview answers, optimize their LinkedIn, and manage their private job matches and applications. Every tool acts as the signed-in user; data is scoped by RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfileTool,
    getResumeTool,
    updateResumeTool,
    listMatchesTool,
    addMatchTool,
    listApplicationsTool,
    addApplicationTool,
    updateApplicationTool,
    tailorResumeTool,
    coverLetterTool,
    referralDmTool,
    linkedinOptimizeTool,
    interviewStarTool,
    followupTool,
  ],
});
