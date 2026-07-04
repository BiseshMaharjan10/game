const POLITICIANS = [
  'Mayor Aldric Vane', 'Governor Mira Solace', 'Senator Toran Blackwood',
  'Councilor Elara Venn', 'Minister Dorian Craine', 'Commissioner Selene Hart',
  'Chancellor Orin Voss', 'Ambassador Kaelen Ash', 'Senator Lyra Dunmore',
  'Governor Rourke Stanton', 'Council President Thalia Wren', 'Minister Phelan Cross',
];

const COMPANIES = [
  'Aether Mining Corp', 'Verdant AgriGroup', 'Ironhold Industries',
  'Cipher Dynamics', 'Solara Energy Ltd', 'Meridian Shipping Co',
  'Onyx Construction', 'PulseTech Solutions', 'Crestfall Pharma',
  'Titan Merchants Guild', 'Northgate Holdings', 'EmberBridge Partners',
];

const CITIES = [
  'Bridgefort', 'Rivermarch', 'Eastgate', 'Seabright', 'Wayrest',
  'Stonehollow', 'Ashwick', 'Fernwood', 'Thornwall', 'Blacktide',
  'Goldport', 'Silverbrook',
];

const PROJECTS = [
  'harbor expansion', 'metro rail system', 'public housing initiative',
  'highway modernization', 'water treatment plant', 'smart city grid',
  'airport terminal upgrade', 'bridge reconstruction', 'sports complex',
  'industrial park development', 'coastal defense system', 'telecom infrastructure',
];

const AMOUNTS = [
  '50,000', '120,000', '250,000', '500,000', '1,000,000',
  '2,500,000', '5,000,000', '10,000,000', '25,000,000', '50,000,000',
];

const TECH_TERMS = [
  'quantum encryption', 'neural interface', 'autonomous drone fleet',
  'biometric database', 'AI surveillance grid', 'blockchain ledger',
  '5G infrastructure', 'cloud migration', 'data mining operation',
  'predictive analytics platform',
];

const CYBER_ELEMENTS = [
  'encrypted server', 'breached firewall', 'zero-day exploit',
  'botnet cluster', 'ransomware deployment', 'credential dump',
  'backdoor access', 'DDoS mitigation system',
];

const SPORTS_TEAMS = [
  'Bridgefort Hammers', 'Eastgate Titans', 'Rivermarch Rovers',
  'Seabright Sharks', 'Stonehollow Giants', 'Ashwick Arrows',
];

const SPORTS_LEAGUES = [
  'National Premier League', 'Continental Championship', 'Regional Cup',
  'Intercity Tournament', 'Golden Shield Series',
];

const HOSPITALS = [
  'Bridgefort General', 'Eastgate Medical Center', 'St. Aldric\'s Hospital',
  'Rivermarch Community Health', 'Seabright Coast Medical',
  'Thornwall Regional Hospital',
];

const UNIVERSITIES = [
  'Bridgefort University', 'Eastgate Institute of Technology',
  'Rivermarch State College', 'Seabright Academy', 'Wayrest University',
  'Stonehollow Liberal Arts College',
];

const CELEBRITIES = [
  'Lena Voss (actress)', 'Damien Crosse (director)', 'Sera Moon (singer)',
  'Orion Knight (athlete)', 'Vivienne Star (influencer)', 'Rex Titan (streamer)',
  'Nova Blaze (producer)', 'Kai Storm (artist)',
];

const ENVIRONMENTAL_SITES = [
  'Coral Reef Reserve', 'Ancient Redwood Forest', 'Wetland Sanctuary',
  'Coastal Dune System', 'Mountain Watershed', 'Tundra Conservation Zone',
  'Mangrove Estuary', 'Prairie Grasslands',
];

const CONTAMINANTS = [
  'mercury', 'arsenic', 'lead', 'pesticide runoff', 'industrial solvents',
  'microplastics', 'nitrate compounds', 'crude oil derivatives',
];

const WITNESS_ARCHETYPES = [
  { type: 'Whistleblower', description: 'A former employee with internal documents.' },
  { type: 'Eyewitness', description: 'Someone who saw the event firsthand.' },
  { type: 'Journalist', description: 'A local reporter who has been investigating the story.' },
  { type: 'Academic', description: 'A university researcher with relevant expertise.' },
  { type: 'Community Leader', description: 'A respected local figure who heard rumors.' },
];

const EVIDENCE_TYPES = [
  { type: 'Financial records', descTemplate: 'Bank statements showing unusual transactions between {entityA} and accounts linked to {entityB}.' },
  { type: 'Email leak', descTemplate: 'Internal emails discussing the {project} deal and alleged coordination between {entityA} and {entityB}.' },
  { type: 'CCTV footage', descTemplate: 'Security camera footage placing {entityA} at a meeting with {entityB} on the night in question.' },
  { type: 'Phone records', descTemplate: 'Call logs showing frequent communication between {entityA} and {entityB} during the negotiation period.' },
  { type: 'Medical report', descTemplate: 'Official medical records documenting unusual treatment patterns at {facility}.' },
  { type: 'Police report', descTemplate: 'Incident report filed with the {city} police department.' },
  { type: 'Company documents', descTemplate: 'Internal memos from {company} authorizing the {project} payment structure.' },
  { type: 'Whistleblower testimony', descTemplate: 'Signed affidavit from a former employee of {company} detailing irregular practices.' },
  { type: 'Social media posts', descTemplate: 'Archived social media activity from {entityA} contradicting their public statements.' },
  { type: 'Contract records', descTemplate: 'Procurement contracts showing the {project} was awarded without competitive bidding.' },
];

module.exports = {
  POLITICIANS, COMPANIES, CITIES, PROJECTS, AMOUNTS,
  TECH_TERMS, CYBER_ELEMENTS,
  SPORTS_TEAMS, SPORTS_LEAGUES,
  HOSPITALS, UNIVERSITIES,
  CELEBRITIES, ENVIRONMENTAL_SITES, CONTAMINANTS,
  WITNESS_ARCHETYPES, EVIDENCE_TYPES,
};
