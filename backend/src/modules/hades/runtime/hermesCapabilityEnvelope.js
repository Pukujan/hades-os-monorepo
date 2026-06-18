export function createHermesCapabilityEnvelope({ grants = [], approvalRequired = [] }) {
  const grantSet = new Set(grants);
  const approvalSet = new Set(approvalRequired);

  return {
    can(capability) {
      return grantSet.has(capability);
    },
    requiresApproval(capability) {
      return approvalSet.has(capability);
    },
  };
}
