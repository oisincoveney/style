/**
 * Public exports. Used by hook scripts (via bunx/npx) and by consumers
 * who want to read a project's .dev.config.json programmatically.
 */

export { readConfig, writeConfig, configPath } from './config.js'
export type { DevConfig, Language, PackageManager, Target, WorkflowFramework } from './config.js'
export { detectProject } from './detect.js'
export type { Detected } from './detect.js'
export { RULE_SKILLS, SUPERPOWER_SKILLS, ALL_SKILLS, skillsForVariant } from './skills.js'
export type { Skill, RuleSkill, SuperpowerSkill, ProjectVariant } from './skills.js'
