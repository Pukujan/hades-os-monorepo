const ACTION_CAPABILITY_MAP = {
  "telegram.send_animation": "telegram.propose_send",
  "telegram.send_message": "telegram.propose_send",
  "discord.send_message": "discord.send",
  "browser.submit": "browser.submit",
  "public.publish": "public.publish",
};

export function createHermesBoundaryActionBroker({ routing, capabilityEnvelope, telegramClientFactory, artifactStore, approvalRepository, pendingBoundaryActionQueue, stateStore } = {}) {
  function mapActionToCapability(type) {
    return ACTION_CAPABILITY_MAP[type] || type;
  }

  async function handleProposedActions({ taskId, routingToken, processId, actions }) {
    const verified = await routing.verifyResponse({ taskId, routingToken, processId, userId: undefined, tenantId: undefined });
    const executed = [];
    const paused = [];
    const queuedBoundary = [];

    for (const action of actions) {
      const capability = mapActionToCapability(action.type);

      if (!capabilityEnvelope.can(capability) && capabilityEnvelope.requiresApproval(capability)) {
        if (approvalRepository) {
          try {
            const approval = await approvalRepository.create({ taskId, action });
            paused.push(approval);
          } catch (err) {
            if (pendingBoundaryActionQueue && stateStore) {
              const queued = await pendingBoundaryActionQueue.enqueue({ taskId, action, error: err.message });
              await stateStore.snapshotPendingBoundaryAction({ taskId, action, queueId: queued.id });
              queuedBoundary.push({ id: queued.id, action });
              continue;
            }
            throw err;
          }
        } else if (pendingBoundaryActionQueue && stateStore) {
          const queued = await pendingBoundaryActionQueue.enqueue({ taskId, action });
          await stateStore.snapshotPendingBoundaryAction({ taskId, action, queueId: queued.id });
          queuedBoundary.push({ id: queued.id, action });
        }
        continue;
      }

      if (!capabilityEnvelope.can(capability)) {
        continue;
      }

      if (action.type === "telegram.send_animation") {
        const client = await telegramClientFactory(verified);
        const signedUrl = await artifactStore.resolveSignedUrl({ objectKey: action.mediaObjectKey });
        const result = await client.sendAnimation({
          chatId: verified.destination.chatId,
          animation: signedUrl,
          caption: action.caption,
        });
        executed.push({ type: action.type, providerMessageId: result.providerMessageId });
      }
    }

    if (queuedBoundary.length > 0) {
      return { status: "queued_for_retry", executed, paused, queuedBoundary };
    }

    if (paused.length > 0) {
      return { status: "approval_required", executed, paused };
    }

    return { executed };
  }

  return { handleProposedActions };
}
