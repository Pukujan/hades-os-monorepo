/** @typedef {"unreviewed" | "partially_reviewed" | "reviewed" | "rejected"} ReviewStatus */

/** @typedef {"ai_extracted_unreviewed" | "source_supported_auto_saved" | "conditional" | "needs_ocr_review" | "corrected_later" | "superseded" | "human_verified"} WorkflowStatus */

/**
 * @typedef {Object} CaseModel
 * @property {string} caseId
 * @property {string | null} county
 * @property {string | null} court
 * @property {string | null} indexNumber
 * @property {string | null} caseName
 * @property {string | null} caseType
 * @property {string | null} judgeName
 * @property {string | null} partName
 * @property {string | null} currentPhase
 * @property {string | null} currentMiniPhase
 * @property {"high" | "medium" | "low"} confidence
 */

/**
 * @typedef {Object} DocumentModel
 * @property {string} documentId
 * @property {string} caseId
 * @property {number | null} nyscefDocNo
 * @property {string | null} title
 * @property {string | null} documentType
 * @property {string | null} filedDateTime
 * @property {string | null} filedBy
 * @property {string} sourceFileName
 * @property {number | null} pageCount
 * @property {string} extractionStatus
 * @property {ReviewStatus} textReviewStatus
 */

/**
 * @typedef {Object} DocumentTextVersionModel
 * @property {string} id
 * @property {string} caseId
 * @property {string} documentId
 * @property {"embedded_text" | "ocr_text" | "ai_parsed_text" | "human_reviewed_text"} versionType
 * @property {string} [textContent]
 * @property {unknown} [structuredJson]
 * @property {"pdf_text" | "ocr" | "llm" | "human_review"} extractionMethod
 * @property {ReviewStatus} reviewStatus
 * @property {"system" | "ai" | "human"} createdBy
 * @property {string} createdAt
 */

/**
 * @typedef {Object} RuleSourceProvenance
 * @property {string} [sourceAuthority] cplr | uniform | county | judge | part | case_order | later_case_order
 * @property {string} [sourceName]
 * @property {number | null} [sourceDocNo]
 * @property {string} [ruleSourceApplied]
 * @property {number} [authorityRank]
 * @property {unknown} [supersedes]
 * @property {string} [sourceText]
 * @property {number} [sourcePage]
 */

/**
 * @typedef {Object} TaskModel
 * @property {string} taskId
 * @property {string} caseId
 * @property {string} [documentId]
 * @property {string} taskDescription
 * @property {string} taskType
 * @property {string | null} responsibleParty
 * @property {string | null} dueDate
 * @property {"fixed" | "calculated" | "no_fixed_due_date" | "needs_review"} dueDateStatus
 * @property {WorkflowStatus} status
 * @property {number} [sourcePage]
 * @property {"high" | "medium" | "low"} confidence
 * @property {string} [docketingNote]
 * @property {string} [sourceAuthority]
 * @property {string} [sourceName]
 * @property {number | null} [sourceDocNo]
 * @property {string} [ruleSourceApplied]
 * @property {number} [authorityRank]
 * @property {unknown} [supersedes]
 * @property {string} [sourceText]
 */

/**
 * @typedef {Object} HumanReviewItemModel
 * @property {string} itemId
 * @property {string} caseId
 * @property {string} documentId
 * @property {number} pageNumber
 * @property {string} location
 * @property {string} issue
 * @property {string} reason
 * @property {string} suggestedAction
 * @property {string} [cropFilePath]
 * @property {boolean} blocking
 * @property {"pending" | "reviewed" | "resolved"} status
 */

/**
 * @typedef {Object} CaseStateSnapshotModel
 * @property {string} snapshotId
 * @property {string} caseId
 * @property {number | null} afterDocNo
 * @property {string | null} currentPhase
 * @property {string | null} currentMiniPhase
 * @property {unknown[]} confirmedFacts
 * @property {unknown[]} carriedForwardContext
 * @property {TaskModel[]} openTasks
 * @property {TaskModel[]} completedTasks
 * @property {TaskModel[]} conditionalTasks
 * @property {HumanReviewItemModel[]} unresolvedHumanReviewItems
 * @property {unknown[]} conflicts
 * @property {string[]} auditNotes
 * @property {string} createdAt
 */

export {};
