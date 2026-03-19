import { createReferenceAuthority as createReferenceAuthorityFactory, createReferenceKeys } from "./reference-runtime.mjs";

const referenceAuthority = createReferenceAuthorityFactory();

export const createReferenceAuthority = createReferenceAuthorityFactory;
export const issueCapability = (...args) => referenceAuthority.issueCapability(...args);
export const evaluateAction = (...args) => referenceAuthority.evaluateAction(...args);
export const evolvePolicy = (...args) => referenceAuthority.evolvePolicy(...args);
export const recordResult = (...args) => referenceAuthority.recordResult(...args);
export const buildRollbackPlan = (...args) => referenceAuthority.buildRollbackPlan(...args);
export const getPublishedKeys = (...args) => referenceAuthority.getPublishedKeys(...args);
export { createReferenceKeys };
export { createEvaluator } from "./core/evaluator.mjs";
export { PROTOCOL_VERSION } from "./protocol/constants.mjs";
export { parseActionDescriptor, normalizeActionDescriptor, hashNormalizedAction } from "./core/normalize.mjs";
export { loadPackDirectory, resolvePackSelection } from "./core/packs.mjs";
export { verifyCapabilityToken, verifyDecisionToken, preflightLocally } from "./verifier/index.mjs";
