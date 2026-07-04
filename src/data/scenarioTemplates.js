const TEMPLATES = [
  // ── Politics: Corruption ──────────────────────────────────────────────
  {
    id: 'political-corruption',
    categories: ['Politics', 'Crime'],
    truthProbability: 0.7,
    variables: [
      { name: 'politician', pool: 'POLITICIANS' },
      { name: 'company', pool: 'COMPANIES' },
      { name: 'city', pool: 'CITIES' },
      { name: 'amount', pool: 'AMOUNTS' },
      { name: 'project', pool: 'PROJECTS' },
    ],
    tipTemplates: {
      true: [
        'An anonymous source claims that {politician} secretly accepted a bribe of ${amount} from {company} before approving the {project} in {city}.',
        'A whistleblower alleges that {politician} took kickbacks from {company} in exchange for fast-tracking the {project} in {city}.',
        'Investigative sources report that {politician} received ${amount} from {company} to rig the {project} bidding process in {city}.',
      ],
      false: [
        'Rumors are spreading that {politician} may have accepted bribes from {company} related to the {project} in {city}.',
        'Anonymous allegations have surfaced claiming {politician} took money from {company} regarding the {project}.',
        'Unverified reports suggest that {politician} might have been involved in a kickback scheme with {company}.',
      ],
    },
    factStructure: {
      politician: { from: 'politician' },
      company: { from: 'company' },
      amount: { from: 'amount' },
      city: { from: 'city' },
      project: { from: 'project' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Bank statements showing transfers between {company} and accounts linked to {politician}.' },
      { type: 'Email leak', descTemplate: 'Internal emails from {company} discussing the {project} payment schedule to {politician}.' },
      { type: 'Whistleblower testimony', descTemplate: 'A former {company} executive affidavit detailing the bribe arrangement with {politician}.' },
      { type: 'Contract records', descTemplate: 'Procurement documents showing the {project} was awarded to {company} without competitive bidding.' },
    ],
    suspects: [
      { role: 'politician', label: 'The official', source: 'politician' },
      { role: 'company', label: 'The corporation', source: 'company' },
    ],
  },

  // ── Politics: Campaign Finance ────────────────────────────────────────
  {
    id: 'campaign-finance-violation',
    categories: ['Politics', 'Business'],
    truthProbability: 0.65,
    variables: [
      { name: 'politician', pool: 'POLITICIANS' },
      { name: 'company', pool: 'COMPANIES' },
      { name: 'amount', pool: 'AMOUNTS' },
      { name: 'city', pool: 'CITIES' },
    ],
    tipTemplates: {
      true: [
        'A former campaign aide reports that {politician} accepted ${amount} in illegal donations from {company} through shell accounts. The money was never disclosed to election authorities.',


        'Leaked financial documents suggest {company} funneled ${amount} to {politician}\'s campaign through a network of dummy corporations.',
      ],
      false: [
        'Whisper campaign alleges that {politician} received undeclared funding from {company} during their last election run in {city}.',
        'Rumors are circulating that {company} made illegal campaign contributions to {politician} through third-party intermediaries.',
      ],
    },
    factStructure: {
      politician: { from: 'politician' },
      company: { from: 'company' },
      amount: { from: 'amount' },
      city: { from: 'city' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Shell company transactions linking {company} to {politician campaign accounts.' },
      { type: 'Email leak', descTemplate: 'Emails between {company} executives and {politician}\'s campaign staff discussing donation limits.' },
    ],
    suspects: [
      { role: 'politician', label: 'The candidate', source: 'politician' },
      { role: 'company', label: 'The donor', source: 'company' },
    ],
  },

  // ── Crime: Corporate Fraud ────────────────────────────────────────────
  {
    id: 'corporate-fraud',
    categories: ['Crime', 'Business'],
    truthProbability: 0.75,
    variables: [
      { name: 'company', pool: 'COMPANIES' },
      { name: 'amount', pool: 'AMOUNTS' },
      { name: 'city', pool: 'CITIES' },
      { name: 'project', pool: 'PROJECTS' },
    ],
    tipTemplates: {
      true: [
        'Internal auditor reveals that {company} has been inflating revenue figures by ${amount} to mislead investors about the {project} in {city}.',
        'A former financial officer at {company} claims executives fabricated ${amount} in earnings related to the {project}.',
      ],
      false: [
        'Anonymous tip suggests that {company} may have misrepresented financial data regarding their {project} in {city}.',
        'Questions are being raised about the accounting practices of {company} concerning the {project}.',
      ],
    },
    factStructure: {
      company: { from: 'company' },
      amount: { from: 'amount' },
      city: { from: 'city' },
      project: { from: 'project' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Audited statements showing a discrepancy of ${amount} in the {project} division of {company}.' },
      { type: 'Company documents', descTemplate: 'Internal memos from {company} executives instructing staff to alter revenue projections.' },
    ],
    suspects: [
      { role: 'company', label: 'The corporation', source: 'company' },
    ],
  },

  // ── Technology: Data Breach ───────────────────────────────────────────
  {
    id: 'data-breach',
    categories: ['Technology', 'Crime'],
    truthProbability: 0.6,
    variables: [
      { name: 'company', pool: 'COMPANIES' },
      { name: 'techTerm', pool: 'TECH_TERMS' },
      { name: 'city', pool: 'CITIES' },
      { name: 'amount', pool: 'AMOUNTS' },
    ],
    tipTemplates: {
      true: [
        'A security researcher has discovered that {company} suffered a massive data breach exposing {amount} user records. The company has not disclosed the incident involving their {techTerm} system.',
        'Leaked internal documents show {company} knew about a security vulnerability in their {techTerm} platform but chose not to fix it or notify affected users.',
      ],
      false: [
        'An unverified claim states that {company} experienced a data breach affecting their {techTerm} infrastructure, potentially exposing sensitive information.',
        'Social media posts allege that {company} covered up a security incident involving their {techTerm} system in {city}.',
      ],
    },
    factStructure: {
      company: { from: 'company' },
      techTerm: { from: 'techTerm' },
      city: { from: 'city' },
      recordsExposed: { from: 'amount' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Company documents', descTemplate: 'Internal security audit from {company} documenting the {techTerm} vulnerability.' },
      { type: 'Email leak', descTemplate: 'Emails between {company} executives discussing whether to disclose the breach.' },
    ],
    witnesses: [
      { type: 'Whistleblower', description: 'A former security engineer at {company} who reported the vulnerability internally.' },
    ],
  },

  // ── Technology: AI Ethics ─────────────────────────────────────────────
  {
    id: 'ai-ethics-violation',
    categories: ['Technology', 'Health'],
    truthProbability: 0.5,
    variables: [
      { name: 'company', pool: 'COMPANIES' },
      { name: 'techTerm', pool: 'TECH_TERMS' },
      { name: 'city', pool: 'CITIES' },
    ],
    tipTemplates: {
      true: [
        'Researchers have found that {company} {techTerm} system is making biased decisions against minority groups. Internal testing showed a 40% error rate for certain demographics, but the company deployed it anyway across {city}.',
      ],
      false: [
        'Online forums are claiming that {company} {techTerm} platform contains algorithmic bias. No concrete data has been provided to support these allegations.',
      ],
    },
    factStructure: {
      company: { from: 'company' },
      system: { from: 'techTerm' },
      city: { from: 'city' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Company documents', descTemplate: 'Internal test results showing disparate error rates in the {techTerm} system across demographic groups.' },
      { type: 'Whistleblower testimony', descTemplate: 'A former {company} data scientist testimony about suppressed audit findings.' },
    ],
  },

  // ── Entertainment: Scandal ────────────────────────────────────────────
  {
    id: 'celebrity-scandal',
    categories: ['Entertainment'],
    truthProbability: 0.45,
    variables: [
      { name: 'celebrity', pool: 'CELEBRITIES' },
      { name: 'city', pool: 'CITIES' },
      { name: 'amount', pool: 'AMOUNTS' },
    ],
    tipTemplates: {
      true: [
        'A former business partner claims that {celebrity} was involved in a ${amount} tax evasion scheme using offshore accounts routed through {city}.',
        'Backstage sources report that {celebrity} has been secretly purchasing properties in {city} through shell companies to avoid scrutiny.',
      ],
      false: [
        'A tabloid claims that {celebrity} is under investigation for financial misconduct involving properties in {city}. No official confirmation exists.',
        'Gossip columns are reporting that {celebrity} may be facing legal trouble over undeclared income of ${amount}.',
      ],
    },
    factStructure: {
      celebrity: { from: 'celebrity' },
      city: { from: 'city' },
      amount: { from: 'amount' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Offshore account documents linking {celebrity} to shell companies in {city}.' },
      { type: 'Email leak', descTemplate: 'Emails between {celebrity} manager and a financial advisor discussing tax avoidance strategies.' },
    ],
  },

  // ── Sports: Match Fixing ──────────────────────────────────────────────
  {
    id: 'match-fixing',
    categories: ['Sports', 'Crime'],
    truthProbability: 0.55,
    variables: [
      { name: 'team', pool: 'SPORTS_TEAMS' },
      { name: 'league', pool: 'SPORTS_LEAGUES' },
      { name: 'amount', pool: 'AMOUNTS' },
      { name: 'city', pool: 'CITIES' },
    ],
    tipTemplates: {
      true: [
        'A former referee has come forward claiming that several matches in the {league} involving {team} were fixed. Bets totaling ${amount} were placed through an illegal gambling ring operating out of {city}.',
        'Investigators have uncovered evidence that {team} players were paid ${amount} to throw matches in the {league}.',
      ],
      false: [
        'Unsubstantiated claims on social media suggest that {team} matches in the {league} may have been manipulated by gamblers in {city}.',
        'A rumor is circulating that a betting syndicate in {city} approached {team} players about {league} match fixing, but no evidence has emerged.',
      ],
    },
    factStructure: {
      team: { from: 'team' },
      league: { from: 'league' },
      amount: { from: 'amount' },
      city: { from: 'city' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Bank transactions showing large payments to {team} players from accounts traced to {city}.' },
      { type: 'Email leak', descTemplate: 'Encrypted messages between a betting ring in {city} and {team} players discussing match outcomes.' },
      { type: 'Phone records', descTemplate: 'Call records between known gamblers and {team} players before key {league} matches.' },
    ],
    suspects: [
      { role: 'team', label: 'The team', source: 'team' },
    ],
  },

  // ── Health: Hospital Negligence ───────────────────────────────────────
  {
    id: 'hospital-negligence',
    categories: ['Health', 'Crime'],
    truthProbability: 0.65,
    variables: [
      { name: 'hospital', pool: 'HOSPITALS' },
      { name: 'city', pool: 'CITIES' },
      { name: 'amount', pool: 'AMOUNTS' },
    ],
    tipTemplates: {
      true: [
        'A group of nurses at {hospital} has submitted a formal complaint alleging that administrators falsified patient recovery rates to secure ${amount} in government funding. Patients in the understaffed ward have suffered complications.',
        'Documents leaked from {hospital} show that the facility has been operating with expired medical supplies to cut costs while billing patients full price.',
      ],
      false: [
        'Anonymous complaints allege that {hospital} in {city} has been cutting corners on patient care. Hospital administration denies all claims.',
        'A social media post claiming that {hospital} is underinvestigating for medical negligence has gone viral, but authorities have not confirmed any inquiry.',
      ],
    },
    factStructure: {
      hospital: { from: 'hospital' },
      city: { from: 'city' },
      amount: { from: 'amount' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Medical report', descTemplate: 'Patient outcome reports from {hospital} showing discrepancies between internal and published data.' },
      { type: 'Whistleblower testimony', descTemplate: 'Affidavit from a senior nurse at {hospital} detailing the falsification of records.' },
      { type: 'Company documents', descTemplate: 'Inventory records from {hospital} showing expired supplies still in use.' },
    ],
    witnesses: [
      { type: 'Whistleblower', description: 'A senior nurse at {hospital} who documented the discrepancies.' },
    ],
  },

  // ── Environment: Pollution ────────────────────────────────────────────
  {
    id: 'industrial-pollution',
    categories: ['Environment', 'Business'],
    truthProbability: 0.7,
    variables: [
      { name: 'company', pool: 'COMPANIES' },
      { name: 'city', pool: 'CITIES' },
      { name: 'contaminant', pool: 'CONTAMINANTS' },
      { name: 'site', pool: 'ENVIRONMENTAL_SITES' },
    ],
    tipTemplates: {
      true: [
        'Environmental monitors have detected high levels of {contaminant} in the {site} near {city}. Independent testing suggests {company} has been illegally dumping waste into the water system.',
        'Satellite imagery analysis shows {company} has been operating an unregistered discharge pipe leading directly into the {site} ecosystem.',
      ],
      false: [
        'An environmental activist group has claimed that {company} is polluting the {site} near {city} with {contaminant}. Official tests have not confirmed this.',
        'Unverified reports suggest that the {site} ecosystem may be threatened by industrial runoff from {company} operations.',
      ],
    },
    factStructure: {
      company: { from: 'company' },
      city: { from: 'city' },
      contaminant: { from: 'contaminant' },
      site: { from: 'site' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Company documents', descTemplate: 'Internal {company} reports discussing waste disposal methods and cost-saving measures.' },
      { type: 'CCTV footage', descTemplate: 'Security footage from the {site} area showing {company} trucks dumping materials at night.' },
      { type: 'Medical report', descTemplate: 'Health records from {city} residents showing elevated levels of {contaminant}.' },
    ],
    suspects: [
      { role: 'company', label: 'The corporation', source: 'company' },
    ],
  },

  // ── Education: Academic Fraud ─────────────────────────────────────────
  {
    id: 'academic-fraud',
    categories: ['Education'],
    truthProbability: 0.6,
    variables: [
      { name: 'university', pool: 'UNIVERSITIES' },
      { name: 'city', pool: 'CITIES' },
      { name: 'amount', pool: 'AMOUNTS' },
    ],
    tipTemplates: {
      true: [
        'A group of professors at {university} has published an open letter alleging that the administration manipulated admissions data to inflate rankings and secure ${amount} in donations. International students were admitted with falsified credentials.',
        'Former admissions officer at {university} reveals that wealthy donors received preferential admission for unqualified applicants in exchange for contributions.',
      ],
      false: [
        'Anonymous posts on an academic forum claim that {university} has been falsifying admission statistics. The university has issued a denial.',
        'Rumors are circulating that {university} may have manipulated research data to attract funding from international sources.',
      ],
    },
    factStructure: {
      university: { from: 'university' },
      city: { from: 'city' },
      amount: { from: 'amount' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Email leak', descTemplate: 'Internal emails from {university} admissions office discussing quota manipulation.' },
      { type: 'Company documents', descTemplate: 'Admissions records showing discrepancies between reported and actual student qualifications.' },
    ],
  },

  // ── International: Diplomatic Incident ────────────────────────────────
  {
    id: 'diplomatic-incident',
    categories: ['International', 'Politics'],
    truthProbability: 0.5,
    variables: [
      { name: 'politician', pool: 'POLITICIANS' },
      { name: 'city', pool: 'CITIES' },
      { name: 'project', pool: 'PROJECTS' },
    ],
    tipTemplates: {
      true: [
        'Diplomatic cables obtained by a foreign correspondent reveal that {politician} secretly negotiated a deal allowing foreign intelligence operatives access to the {project} infrastructure in {city}.',
        'A diplomatic source confirms that {politician} offered classified information about the {project} to a foreign power in exchange for political support.',
      ],
      false: [
        'International media is reporting that {politician} may have been involved in unauthorized diplomatic communications regarding the {project}. No official confirmation.',
        'Allegations have emerged that {politician} shared sensitive information about the {project} with foreign entities. The claims remain unverified.',
      ],
    },
    factStructure: {
      politician: { from: 'politician' },
      city: { from: 'city' },
      project: { from: 'project' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Email leak', descTemplate: 'Encrypted diplomatic correspondence between {politician} office and foreign nationals.' },
      { type: 'Phone records', descTemplate: 'Call detail records showing frequent contact between {politician} and known foreign intelligence officers.' },
    ],
    suspects: [
      { role: 'politician', label: 'The official', source: 'politician' },
    ],
    witnesses: [
      { type: 'Journalist', description: 'A foreign correspondent who obtained the diplomatic cables.' },
    ],
  },

  // ── Business: Insider Trading ─────────────────────────────────────────
  {
    id: 'insider-trading',
    categories: ['Business', 'Crime'],
    truthProbability: 0.65,
    variables: [
      { name: 'company', pool: 'COMPANIES' },
      { name: 'amount', pool: 'AMOUNTS' },
      { name: 'city', pool: 'CITIES' },
    ],
    tipTemplates: {
      true: [
        'Market regulators have detected unusual trading patterns in {company} stock. An investigation reveals that executives sold ${amount} in shares days before a negative earnings report was made public.',
        'A brokerage firm compliance officer has flagged transactions showing {company} insiders traded on non-public information about a failed acquisition deal.',
      ],
      false: [
        'An anonymous market tip suggests that {company} executives may have engaged in insider trading before a recent earnings announcement. Regulators have not commented.',
        'Online trading forums are abuzz with claims that {company} stock movements before the last quarterly report indicate possible insider trading.',
      ],
    },
    factStructure: {
      company: { from: 'company' },
      amount: { from: 'amount' },
      city: { from: 'city' },
      happened: { truth: true },
    },
    evidencePool: [
      { type: 'Financial records', descTemplate: 'Trading records showing unusual stock movements in {company} days before the earnings announcement.' },
      { type: 'Email leak', descTemplate: 'Internal emails from {company} executives discussing their stock selloff strategy.' },
    ],
    suspects: [
      { role: 'company', label: 'Company executives', source: 'company' },
    ],
  },
];

module.exports = { TEMPLATES };
