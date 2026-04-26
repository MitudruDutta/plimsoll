"""
Script to load port information and regulations for major world ports into the Knowledge Base.

Usage:
    python scripts/load_port_data.py

This script populates the ChromaDB vector store with:
- Port-specific regulations and requirements
- Required documents for port entry
- Customs and immigration procedures
- Pilotage and berthing requirements
- Regional environmental regulations
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
from typing import Any

from langchain_core.documents import Document

from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Major world ports data
MAJOR_PORTS_DATA: list[dict[str, Any]] = [
    # Asia Pacific
    {
        "port_code": "SGSIN",
        "port_name": "Port of Singapore",
        "country": "Singapore",
        "region": "Asia Pacific",
        "timezone": "UTC+8",
        "vts_channel": "VHF Channel 14",
        "pilot_boarding": "Eastern Boarding Ground A/B or Western Boarding Ground",
        "max_draft": 23.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate (1969)",
            "International Load Line Certificate",
            "Safety Management Certificate (SMC)",
            "Document of Compliance (DOC)",
            "International Ship Security Certificate (ISSC)",
            "Continuous Synopsis Record (CSR)",
            "IOPP Certificate",
            "International Anti-fouling System Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Passenger List (if applicable)",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Last Port Clearance",
            "Cargo Manifest",
            "Dangerous Goods Manifest (if applicable)",
            "Ship Stores Declaration",
            "Crew Effects Declaration",
        ],
        "pre_arrival_notice": "48 hours for vessels over 300 GT",
        "regulations": """
PORT OF SINGAPORE REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- Submit Pre-Arrival Notification (PAN) via MARINET at least 48 hours before arrival
- Dangerous cargo: Additional 96 hours notice required
- ISPS Declaration of Security may be required
- Submit Maritime Declaration of Health 24 hours prior

2. PILOTAGE
- Compulsory for vessels over 300 GT
- Pilot boarding at Eastern or Western Boarding Ground
- VHF Channel 14 for port operations
- Minimum 2 hours notice for pilot request

3. DOCUMENTATION
All vessels must present original certificates to MPA inspectors:
- Statutory certificates as per SOLAS/MARPOL
- Class certificates
- Crew certification documents
- Previous Port State Control reports (if any deficiencies)

4. CUSTOMS AND IMMIGRATION
- Advance Passenger Information System (APIS) submission required
- Crew going ashore require valid passport and shore pass
- Ship stores must be declared accurately
- Bonded stores to be sealed during port stay

5. ENVIRONMENTAL REGULATIONS
- Singapore is a MARPOL Special Area for Annex I
- No discharge of oily water within port limits
- Garbage disposal only through licensed contractors
- Ballast water exchange required before arrival
- Low sulfur fuel (0.5% max) required in port

6. PORT STATE CONTROL
- Singapore is a member of Tokyo MOU
- High-risk vessels subject to expanded inspection
- Common deficiencies: fire safety, life-saving appliances, MARPOL

7. SECURITY
- ISPS Code fully implemented
- Security Level typically at Level 1
- Access control at all terminals
- CCTV monitoring throughout port
""",
        "customs_info": """
SINGAPORE CUSTOMS REQUIREMENTS

1. IMPORT/EXPORT DECLARATIONS
- All cargo requires TradeNet declaration
- Controlled items require permits (arms, drugs precursors, etc.)
- Free Trade Zone available for transshipment cargo

2. SHIP STORES
- Reasonable quantities allowed duty-free
- Excess stores subject to duties
- Tobacco and alcohol limits apply

3. CREW EFFECTS
- Personal effects duty-free within limits
- Currency declaration required over SGD 20,000
- Prohibited items strictly enforced
""",
    },
    {
        "port_code": "CNSHA",
        "port_name": "Port of Shanghai",
        "country": "China",
        "region": "Asia Pacific",
        "timezone": "UTC+8",
        "vts_channel": "VHF Channel 16/08",
        "pilot_boarding": "Yangtze River Pilot Station or Yangshan Deep Water Port",
        "max_draft": 15.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List (with Chinese translation)",
            "Passenger List",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Cargo Manifest",
            "Bill of Lading",
            "Dangerous Goods Manifest",
            "Ship Stores Declaration",
            "Bonded Stores List",
            "Last 10 Ports of Call List",
        ],
        "pre_arrival_notice": "24 hours",
        "regulations": """
PORT OF SHANGHAI REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- Submit arrival documents via China MSA Single Window
- 24 hours advance notice minimum
- Dangerous goods: 48 hours advance notice
- Health declaration via CIQ system

2. PILOTAGE
- Compulsory pilotage for all foreign vessels
- Yangtze River pilots for river terminals
- Yangshan pilots for deep water berths
- Pilot request minimum 4 hours notice

3. DOCUMENTATION
- All certificates must be valid
- Chinese translations required for key documents
- Agent must submit documents to MSA, Customs, CIQ
- Previous PSC inspection reports required

4. CUSTOMS AND IMMIGRATION
- Crew shore leave permits through agent
- 72/144-hour visa-free transit available for some nationalities
- Ship stores subject to inspection
- Temporary import permits for ship equipment

5. ENVIRONMENTAL REGULATIONS
- Domestic Emission Control Area (DECA)
- 0.5% sulfur fuel required within DECA
- No garbage discharge in port
- Ballast water regulations strictly enforced
- Shore power connection encouraged at equipped berths

6. PORT STATE CONTROL
- China is member of Tokyo MOU
- Focus areas: crew certification, safety equipment, MARPOL compliance
- High detention rates for sub-standard vessels

7. SPECIAL REQUIREMENTS
- AIS must be operational at all times
- No photography in port without permission
- Security zones clearly marked
- Gangway watch required 24/7
""",
        "customs_info": """
CHINA CUSTOMS REQUIREMENTS - SHANGHAI

1. CARGO DECLARATIONS
- Electronic manifest submission via Single Window
- Advance cargo manifest 24 hours before loading
- Inspection rate varies by commodity and origin

2. SHIP STORES
- Detailed inventory required
- Bonded stores to be sealed
- Tobacco/alcohol strictly controlled

3. TEMPORARY IMPORTS
- Ship spare parts may require permits
- Returnable items need temporary import declaration
""",
    },
    {
        "port_code": "HKHKG",
        "port_name": "Port of Hong Kong",
        "country": "Hong Kong SAR",
        "region": "Asia Pacific",
        "timezone": "UTC+8",
        "vts_channel": "VHF Channel 12",
        "pilot_boarding": "Pilot Station (Green Island)",
        "max_draft": 15.5,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Declaration",
            "Ship Stores Declaration",
        ],
        "pre_arrival_notice": "24 hours",
        "regulations": """
PORT OF HONG KONG REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- Submit arrival notice to Marine Department 24 hours prior
- Dangerous goods declaration 48 hours in advance
- Health declaration if from affected areas

2. PILOTAGE
- Compulsory for vessels over 3000 GT or 150m length
- Pilot boarding near Green Island
- VHF Channel 12 for Vessel Traffic Centre
- Request through shipping agent

3. DOCUMENTATION
- Original certificates for Marine Department inspection
- Crew list submission via MARDEP electronic system
- Cargo manifest for Customs

4. CUSTOMS AND IMMIGRATION
- Hong Kong is a free port (minimal customs duties)
- Crew shore leave straightforward process
- Immigration clearance through agent

5. ENVIRONMENTAL REGULATIONS
- Air Pollution Control requirements
- 0.5% sulfur fuel at berth (switching required)
- Garbage disposal through licensed collectors only

6. PORT STATE CONTROL
- Hong Kong is member of Tokyo MOU
- Modern, well-maintained vessels typically cleared quickly
""",
        "customs_info": """
HONG KONG CUSTOMS

Hong Kong operates as a free port:
- No customs tariffs on most goods
- Excise duties only on tobacco, alcohol, hydrocarbon fuels
- Simple import/export documentation
- Efficient cargo clearance procedures
""",
    },
    # Europe
    {
        "port_code": "NLRTM",
        "port_name": "Port of Rotterdam",
        "country": "Netherlands",
        "region": "Europe",
        "timezone": "UTC+1/+2 (DST)",
        "vts_channel": "VHF Channel 11/14",
        "pilot_boarding": "Maas Pilot Station",
        "max_draft": 24.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "International Energy Efficiency Certificate",
            "Ballast Water Management Certificate",
            "CLC Certificate (oil tankers)",
            "Bunker Convention Certificate",
            "Wreck Removal Convention Certificate",
            "Crew List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Waste Notification Form",
            "EU MRV Data (CO2 emissions)",
            "Ship Sanitation Certificate",
        ],
        "pre_arrival_notice": "24 hours via SafeSeaNet",
        "regulations": """
PORT OF ROTTERDAM REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- Notification via SafeSeaNet (EU Single Window) 24 hours prior
- Dangerous goods: IMDG manifest 24 hours in advance
- Waste notification form required
- EU MRV CO2 reporting compliance required

2. PILOTAGE
- Compulsory for vessels over 60m or carrying dangerous cargo
- Maas Pilot Station for inbound vessels
- VHF Channel 11 (Maas Approach) / Channel 14 (Port Control)
- 2 hours minimum notice for pilot

3. DOCUMENTATION
All EU and international statutory certificates required:
- MLC 2006 certification
- IHM (Inventory of Hazardous Materials) for EU port calls
- EU MRV monitoring plan and annual report

4. CUSTOMS AND IMMIGRATION
- Schengen area entry requirements
- Advance cargo declaration via EU ICS2
- Ship stores must be declared
- Crew shore leave with valid travel documents

5. ENVIRONMENTAL REGULATIONS - EU REQUIREMENTS
- EU MRV Regulation compliance mandatory
- SECA (Sulphur Emission Control Area): 0.1% max sulphur
- NECA (Nitrogen Emission Control Area) from 2021: Tier III
- Waste reception mandatory - no charge for MARPOL waste
- Shore power available and encouraged

6. PORT STATE CONTROL
- Rotterdam is Paris MOU headquarters
- Strict enforcement of EU ship inspection regime
- THETIS database for targeting
- Focus on environmental compliance, MLC, safety

7. SECURITY
- ISPS compliant terminals
- Schengen border controls apply
- Pre-arrival security information required
""",
        "customs_info": """
NETHERLANDS/EU CUSTOMS - ROTTERDAM

1. CUSTOMS PROCEDURES
- EU Customs Code applies
- Import Control System (ICS2) advance manifest
- Entry Summary Declaration (ENS) required
- NCTS for transit procedures

2. FREE ZONES
- Rotterdam Free Zone available
- Customs warehousing facilities
- VAT deferment schemes

3. SHIP SUPPLIES
- Union goods procedure for stores
- Bonded stores management
- Simplified procedures for regular callers
""",
    },
    {
        "port_code": "DEHAM",
        "port_name": "Port of Hamburg",
        "country": "Germany",
        "region": "Europe",
        "timezone": "UTC+1/+2 (DST)",
        "vts_channel": "VHF Channel 14",
        "pilot_boarding": "Elbe Pilot Station",
        "max_draft": 15.1,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "International Energy Efficiency Certificate",
            "Ballast Water Management Certificate",
            "Civil Liability Certificates",
            "Crew List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Waste Notification Form",
            "EU MRV Documentation",
        ],
        "pre_arrival_notice": "24 hours via SafeSeaNet",
        "regulations": """
PORT OF HAMBURG REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- SafeSeaNet notification 24 hours before arrival
- Dangerous goods declaration via GEGIS system
- Waste notification form submission
- Health declaration if applicable

2. PILOTAGE
- Compulsory on River Elbe
- Elbe pilots board at sea (Elbe 1 station)
- VHF Channel 14 for Hamburg Port Traffic
- Tidal windows for deep draft vessels

3. DOCUMENTATION
- All SOLAS/MARPOL certificates
- EU MRV compliance documentation
- IHM Certificate for ships over 500 GT
- MLC documentation

4. CUSTOMS AND IMMIGRATION
- EU/Schengen procedures apply
- Crew shore leave with valid documents
- Advance cargo declaration required

5. ENVIRONMENTAL REGULATIONS
- SECA: 0.1% sulphur maximum
- NECA: Tier III NOx for new vessels
- Shore power (Landstrom) available
- Environmental Ship Index (ESI) incentives

6. PORT STATE CONTROL
- German Federal Maritime Agency (BSH) enforcement
- Paris MOU member
- Focus on structural safety, pollution prevention
""",
        "customs_info": """
GERMAN CUSTOMS - HAMBURG

1. EU CUSTOMS PROCEDURES
- ATLAS electronic customs system
- ENS/EXS declarations required
- AEO certification benefits available

2. FREE PORT
- Free Port area for certain operations
- Simplified procedures for transshipment
""",
    },
    {
        "port_code": "GBFXT",
        "port_name": "Port of Felixstowe",
        "country": "United Kingdom",
        "region": "Europe",
        "timezone": "UTC+0/+1 (DST)",
        "vts_channel": "VHF Channel 14",
        "pilot_boarding": "Cork Sand / Sunk Pilot Station",
        "max_draft": 14.5,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Ship Sanitation Certificate",
            "UK MRV Documentation (post-Brexit)",
        ],
        "pre_arrival_notice": "24 hours",
        "regulations": """
PORT OF FELIXSTOWE REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- Advance notification 24 hours
- Dangerous goods declaration 24 hours
- Maritime Declaration of Health if applicable
- Post-Brexit: Additional customs documentation

2. PILOTAGE
- Compulsory pilotage
- Pilot boarding at Cork Sand or Sunk stations
- VHF Channel 14 for Harwich Haven Authority

3. DOCUMENTATION
- All statutory certificates
- Post-Brexit: UK certificates/documentation may differ from EU
- MLC compliance documentation

4. CUSTOMS AND IMMIGRATION
- Post-Brexit: UK is outside EU Customs Union
- Import/export declarations required for EU trade
- GVMS (Goods Vehicle Movement Service) for cargo
- Crew shore leave subject to UK immigration rules

5. ENVIRONMENTAL REGULATIONS
- SECA: 0.1% sulphur (still applies post-Brexit)
- UK MRV scheme for emissions monitoring
- Waste reception facilities available

6. PORT STATE CONTROL
- UK MCA enforcement
- Paris MOU member
""",
        "customs_info": """
UK CUSTOMS - FELIXSTOWE (POST-BREXIT)

1. CUSTOMS PROCEDURES
- CHIEF/CDS customs declaration system
- Import declarations required for EU goods
- Export declarations to EU required
- Transit procedures (NCTS) applicable

2. FREEPORT STATUS
- Felixstowe designated as Freeport
- Customs and tax benefits available
- Simplified procedures for qualifying goods
""",
    },
    # Americas
    {
        "port_code": "USNYC",
        "port_name": "Port of New York and New Jersey",
        "country": "United States",
        "region": "North America",
        "timezone": "UTC-5/-4 (DST)",
        "vts_channel": "VHF Channel 14",
        "pilot_boarding": "Ambrose Pilot Station",
        "max_draft": 15.2,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Certificate of Financial Responsibility (COFR)",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Cargo Manifest (24-hour rule)",
            "Dangerous Goods Manifest",
            "Importer Security Filing (ISF)",
            "CBP Entry Documents",
            "USCG Certificate of Compliance (if applicable)",
        ],
        "pre_arrival_notice": "96 hours (USCG NVMC)",
        "regulations": """
PORT OF NEW YORK AND NEW JERSEY REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 96-hour Advance Notice of Arrival (NOA) to USCG NVMC
- 24-hour rule: Cargo manifest to CBP 24 hours before loading
- Importer Security Filing (ISF/10+2) required
- APPS (Advance Passenger Information System) for crew/passengers
- Certificate of Financial Responsibility (COFR) for oil pollution liability

2. PILOTAGE
- Compulsory state pilotage
- Sandy Hook Pilots (NJ) or NY/NJ Joint Pilots
- VHF Channel 14 for VTS
- Pilot boarding at Ambrose Station

3. DOCUMENTATION
US-specific requirements in addition to international certificates:
- USCG Certificate of Compliance (COC) for tank vessels
- COFR (vessels over 300 GT)
- Ballast Water Management reporting
- All crew must have valid USCG-accepted STCW certificates

4. CUSTOMS AND IMMIGRATION
- CBP formal entry required
- Crew must remain on board until cleared
- D-1 Crewman visa or C-1/D visa required for shore leave
- I-418 Passenger/Crew List
- TWIC for access to port facilities (US crew)

5. ENVIRONMENTAL REGULATIONS
- North American ECA: 0.1% sulphur maximum
- USCG Ballast Water Management requirements (stricter than IMO)
- EPA VGP (Vessel General Permit) requirements
- APPS (Act to Prevent Pollution from Ships)

6. PORT STATE CONTROL
- USCG conducts port state control inspections
- Qualship 21 program for quality vessels
- Focus on safety, security, environmental compliance
- High detention authority for serious deficiencies

7. SECURITY
- MTSA (Maritime Transportation Security Act) requirements
- Facility Security Plans enforced
- TWIC required for facility access
- 100% container scanning initiatives
""",
        "customs_info": """
US CUSTOMS AND BORDER PROTECTION - NY/NJ

1. CARGO PROCEDURES
- ACE (Automated Commercial Environment) filing required
- ISF (Importer Security Filing) 24+ hours before loading
- Container Security Initiative (CSI) port
- C-TPAT benefits for trusted traders

2. ENTRY REQUIREMENTS
- CBP Form 1302 (Cargo Declaration)
- CBP Form 1300 (Ship's Document)
- CBP Form 1301 (Ship's Stores Declaration)
- CBP Form I-418 (Crew List)

3. BONDED STORES
- Sealed storage required
- Accurate declaration mandatory
- Penalties for discrepancies
""",
    },
    {
        "port_code": "USLAX",
        "port_name": "Port of Los Angeles",
        "country": "United States",
        "region": "North America",
        "timezone": "UTC-8/-7 (DST)",
        "vts_channel": "VHF Channel 14",
        "pilot_boarding": "LA/Long Beach Pilot Station",
        "max_draft": 16.2,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Certificate of Financial Responsibility (COFR)",
            "Crew List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Importer Security Filing (ISF)",
            "CBP Documents",
            "CARB Documentation (California)",
        ],
        "pre_arrival_notice": "96 hours (USCG NVMC)",
        "regulations": """
PORT OF LOS ANGELES REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 96-hour Advance Notice of Arrival to USCG
- 24-hour cargo manifest rule
- ISF filing for imports
- CARB (California) at-berth regulations pre-compliance documentation

2. PILOTAGE
- Joint LA/Long Beach pilotage
- Compulsory for all ocean-going vessels
- VHF Channel 14 for LA VTS

3. DOCUMENTATION
Same as other US ports plus:
- California CARB compliance documentation
- CARB fuel switching records (if applicable)
- Shore power capability documentation

4. CUSTOMS AND IMMIGRATION
- Same CBP requirements as all US ports
- Crew shore leave with proper visa documentation

5. ENVIRONMENTAL REGULATIONS
- North American ECA: 0.1% sulphur
- CARB At-Berth Regulation: Shore power OR equivalent emission reduction
- CARB Ocean-Going Vessel fuel requirements
- California underwater noise reduction initiatives
- Clean Air Action Plan compliance

6. PORT STATE CONTROL
- USCG inspections
- California-specific environmental inspections possible

7. SPECIAL CALIFORNIA REQUIREMENTS
- CARB At-Berth Regulation (most stringent in US)
- Shore power use mandatory at equipped berths
- Alternative control technologies if shore power not available
""",
        "customs_info": """
US CBP - LOS ANGELES

Same as other US ports:
- ACE electronic filing
- ISF required
- C-TPAT benefits available
- Container examination facilities on-site
""",
    },
    # Middle East
    {
        "port_code": "AEJEA",
        "port_name": "Jebel Ali Port",
        "country": "United Arab Emirates",
        "region": "Middle East",
        "timezone": "UTC+4",
        "vts_channel": "VHF Channel 16/09",
        "pilot_boarding": "Jebel Ali Pilot Station",
        "max_draft": 17.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Last 10 Ports of Call",
        ],
        "pre_arrival_notice": "48 hours",
        "regulations": """
JEBEL ALI PORT (DUBAI) REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 48 hours advance notification
- Submit documents via DP World portal
- Health clearance from Dubai Health Authority
- Security information 24 hours prior

2. PILOTAGE
- Compulsory for vessels over 500 GT
- VHF Channel 09 for port operations
- Pilot boarding at designated station

3. DOCUMENTATION
- All statutory certificates
- P&I Club letter of undertaking
- Cargo documentation via DP World system

4. CUSTOMS AND IMMIGRATION
- UAE visa requirements apply to crew
- GCC nationals have easier shore leave
- Ship stores declaration required
- Free Zone benefits available

5. ENVIRONMENTAL REGULATIONS
- IMO 2020 sulphur cap applies
- Garbage disposal through licensed contractors
- Ballast water management required

6. PORT STATE CONTROL
- UAE Federal Transport Authority inspections
- Indian Ocean MOU member
- Focus on safety and crew welfare

7. FREE ZONE
- Jebel Ali Free Zone (JAFZA) benefits
- Simplified customs procedures
- Duty-free storage and transshipment
""",
        "customs_info": """
UAE CUSTOMS - JEBEL ALI

1. FREE ZONE ADVANTAGES
- No import/export duties in Free Zone
- 100% foreign ownership permitted
- Simplified customs clearance

2. GENERAL TRADE
- Dubai Trade portal for customs procedures
- ATA Carnet accepted
- Controlled goods require permits
""",
    },
    # Additional major ports
    {
        "port_code": "JPYOK",
        "port_name": "Port of Yokohama",
        "country": "Japan",
        "region": "Asia Pacific",
        "timezone": "UTC+9",
        "vts_channel": "VHF Channel 16/11",
        "pilot_boarding": "Tokyo Bay Pilot Station",
        "max_draft": 16.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Quarantine Declaration",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Ship Stores Declaration",
        ],
        "pre_arrival_notice": "24 hours",
        "regulations": """
PORT OF YOKOHAMA REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 24 hours advance notification
- Submit via NACCS (Nippon Automated Cargo/Port Clearance System)
- Quarantine pre-clearance available
- Dangerous goods notification 24 hours prior

2. PILOTAGE
- Compulsory in Tokyo Bay
- Tokyo Bay Pilots Association
- VHF Channel 11 for port operations

3. DOCUMENTATION
- All statutory certificates
- Japanese translations may be requested
- Previous PSC records if applicable

4. CUSTOMS AND IMMIGRATION
- Japan Customs electronic system
- Crew shore leave with valid passport
- Ship stores must be declared

5. ENVIRONMENTAL REGULATIONS
- SOx emission standards
- Ballast water management enforced
- Strict garbage regulations

6. PORT STATE CONTROL
- Japan Coast Guard (JCG) inspections
- Tokyo MOU member
- High standards enforced
""",
        "customs_info": """
JAPAN CUSTOMS - YOKOHAMA

1. NACCS SYSTEM
- Electronic customs filing mandatory
- Real-time processing
- Paperless procedures

2. AEO PROGRAM
- Authorized Economic Operator benefits
- Simplified procedures for qualified traders
""",
    },
    {
        "port_code": "KRPUS",
        "port_name": "Port of Busan",
        "country": "South Korea",
        "region": "Asia Pacific",
        "timezone": "UTC+9",
        "vts_channel": "VHF Channel 16/12",
        "pilot_boarding": "Busan Pilot Station",
        "max_draft": 17.0,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Maritime Declaration of Health",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
        ],
        "pre_arrival_notice": "24 hours",
        "regulations": """
PORT OF BUSAN REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 24 hours advance notification via PORT-MIS
- Dangerous goods 24 hours notice
- Health declaration submission

2. PILOTAGE
- Compulsory for vessels over 500 GT
- Busan Harbor Pilot Association
- VHF Channel 12 for operations

3. DOCUMENTATION
- All statutory certificates
- PORT-MIS electronic submission

4. CUSTOMS AND IMMIGRATION
- Korea Customs Service (KCS) clearance
- Crew shore leave permitted with passport
- Efficient cargo clearance system

5. ENVIRONMENTAL REGULATIONS
- IMO 2020 sulphur requirements
- Korean emission standards in port
- Waste disposal regulations

6. PORT STATE CONTROL
- Korean Maritime Safety Tribunal
- Tokyo MOU member
- Focus on structural and safety items
""",
        "customs_info": """
KOREA CUSTOMS - BUSAN

1. UNIPASS SYSTEM
- Electronic customs clearance
- Advance cargo information required
- Real-time processing

2. FREE TRADE ZONES
- Busan-Jinhae Free Economic Zone
- Tax and duty incentives
""",
    },
    {
        "port_code": "BRSSZ",
        "port_name": "Port of Santos",
        "country": "Brazil",
        "region": "South America",
        "timezone": "UTC-3",
        "vts_channel": "VHF Channel 16/14",
        "pilot_boarding": "Santos Pilot Station",
        "max_draft": 13.2,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Last 10 Ports of Call",
        ],
        "pre_arrival_notice": "48 hours",
        "regulations": """
PORT OF SANTOS REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 48 hours advance notification
- ANVISA health clearance required
- Pre-arrival documentation via PORTAL ÚNICO SISCOMEX

2. PILOTAGE
- Compulsory pilotage
- Santos Pilots Association (PRATICAGEM DE SANTOS)
- VHF Channel 14 for port control

3. DOCUMENTATION
- All statutory certificates
- Portuguese translations may be required
- ANVISA sanitization requirements

4. CUSTOMS AND IMMIGRATION
- Brazilian Federal Police clearance
- Crew shore leave with temporary landing permit
- Ship stores strictly controlled
- MERCOSUR documentation benefits

5. ENVIRONMENTAL REGULATIONS
- Brazilian Navy (DPC) environmental requirements
- NORMAM regulations apply
- Ballast water exchange reporting
- Oil record book inspection

6. PORT STATE CONTROL
- Brazilian Navy DPC inspections
- Viña del Mar Agreement (Latin American MOU)
- Focus on safety and environmental compliance

7. SPECIAL REQUIREMENTS
- Brazilian Navy (Capitania dos Portos) clearance
- ANVISA health inspections
- Agricultural inspections (MAPA) for certain cargoes
""",
        "customs_info": """
BRAZIL CUSTOMS - SANTOS

1. SISCOMEX SYSTEM
- Electronic customs declarations mandatory
- Import license (LI) required for controlled goods
- Export registration (RE) required

2. MERCOSUR BENEFITS
- Common external tariff with member countries
- Simplified documentation for regional trade

3. CONTROLLED ITEMS
- Extensive list of controlled products
- Special permits for many categories
""",
    },
    {
        "port_code": "AUSYD",
        "port_name": "Port of Sydney",
        "country": "Australia",
        "region": "Oceania",
        "timezone": "UTC+10/+11 (DST)",
        "vts_channel": "VHF Channel 13",
        "pilot_boarding": "Sydney Pilot Station",
        "max_draft": 14.4,
        "required_documents": [
            "Ship's Registry Certificate",
            "International Tonnage Certificate",
            "International Load Line Certificate",
            "Safety Management Certificate",
            "Document of Compliance",
            "International Ship Security Certificate",
            "IOPP Certificate",
            "Ballast Water Management Certificate",
            "Crew List",
            "Passenger List",
            "Maritime Declaration of Health",
            "Ship Sanitation Certificate",
            "Cargo Manifest",
            "Dangerous Goods Manifest",
            "Australian Quarantine Declaration",
            "Maritime Arrival Report",
        ],
        "pre_arrival_notice": "96 hours",
        "regulations": """
PORT OF SYDNEY REGULATIONS AND REQUIREMENTS

1. PRE-ARRIVAL REQUIREMENTS
- 96 hours advance notification via Maritime Arrivals Reporting System (MARS)
- Pre-arrival report to Australian Border Force (ABF)
- Biosecurity pre-arrival reporting
- Maritime Declaration of Health 12 hours prior

2. PILOTAGE
- Compulsory pilotage for most vessels
- Sydney Pilots
- VHF Channel 13 for Port Authority

3. DOCUMENTATION
- All statutory certificates
- Australian Biosecurity requirements (very strict)
- Maritime Crew Visa (MCV) subclass 988 for crew

4. CUSTOMS AND IMMIGRATION
- Australian Border Force clearance
- Integrated Cargo System (ICS) for cargo
- Strict biosecurity - no food waste discharge
- Crew shore leave with MCV

5. ENVIRONMENTAL REGULATIONS
- Australian biosecurity is extremely strict
- Biofouling management requirements
- Ballast water management (D-2 standard)
- No discharge of food waste in Australian waters

6. PORT STATE CONTROL
- Australian Maritime Safety Authority (AMSA)
- Indian Ocean MOU and Tokyo MOU observer
- Very high inspection standards
- Focus on safety, pollution prevention, MLC

7. BIOSECURITY
- Zero tolerance for biosecurity breaches
- All food waste must be disposed of correctly
- Biofouling inspections possible
- Heavy penalties for non-compliance
""",
        "customs_info": """
AUSTRALIAN BORDER FORCE - SYDNEY

1. INTEGRATED CARGO SYSTEM (ICS)
- Electronic cargo reporting mandatory
- Advance cargo information required
- Risk-based cargo examination

2. BIOSECURITY
- Department of Agriculture, Fisheries and Forestry (DAFF)
- Extremely strict food and plant controls
- Full vessel inspections possible
- Fumigation may be required

3. DUTY AND GST
- 10% GST on most imports
- Various duty rates by product
- Free Trade Agreements with many countries
""",
    },
]


def create_port_documents() -> dict[str, list[Document]]:
    """Create documents from port data for each collection."""
    documents_by_collection: dict[str, list[Document]] = {
        "imo_conventions": [],
        "psc_requirements": [],
        "port_regulations": [],
        "regional_requirements": [],
        "customs_documentation": [],
    }

    for port in MAJOR_PORTS_DATA:
        port_code = port["port_code"]
        port_name = port["port_name"]
        country = port["country"]
        region = port["region"]

        # Base metadata for all documents from this port
        base_metadata = {
            "port_code": port_code,
            "port_name": port_name,
            "country": country,
            "region": region,
            "timezone": port.get("timezone", ""),
            "source": "port_data_loader",
        }

        # 1. Port Regulations Document
        port_reg_content = f"""
PORT REGULATIONS: {port_name} ({port_code})
Country: {country}
Region: {region}
Timezone: {port.get("timezone", "N/A")}

VTS Channel: {port.get("vts_channel", "N/A")}
Pilot Boarding: {port.get("pilot_boarding", "N/A")}
Maximum Draft: {port.get("max_draft", "N/A")} meters
Pre-Arrival Notice: {port.get("pre_arrival_notice", "N/A")}

{port.get("regulations", "")}
"""
        port_reg_doc = Document(
            page_content=port_reg_content,
            metadata={
                **base_metadata,
                "document_type": "port_regulations",
                "max_draft": port.get("max_draft"),
                "vts_channel": port.get("vts_channel"),
            },
        )
        documents_by_collection["port_regulations"].append(port_reg_doc)

        # 2. Required Documents Document
        required_docs = port.get("required_documents", [])
        required_docs_content = f"""
REQUIRED DOCUMENTS FOR PORT ENTRY: {port_name} ({port_code})
Country: {country}
Region: {region}

The following documents are required for vessel entry at {port_name}:

"""
        for i, doc in enumerate(required_docs, 1):
            required_docs_content += f"{i}. {doc}\n"

        required_docs_content += f"""

Pre-Arrival Notice: {port.get("pre_arrival_notice", "Contact agent for details")}

NOTE: Always verify current requirements with your local agent as regulations may change.
Additional documents may be required based on:
- Vessel type (tanker, container, bulk carrier, etc.)
- Cargo type (dangerous goods, livestock, etc.)
- Flag state
- Previous port calls
"""
        required_docs_doc = Document(
            page_content=required_docs_content,
            metadata={
                **base_metadata,
                "document_type": "required_documents_list",
                "required_documents": json.dumps(required_docs),
            },
        )
        documents_by_collection["psc_requirements"].append(required_docs_doc)

        # 3. Customs Documentation
        customs_content = f"""
CUSTOMS AND DOCUMENTATION REQUIREMENTS: {port_name} ({port_code})
Country: {country}
Region: {region}

{port.get("customs_info", "Contact local customs authority for specific requirements.")}

GENERAL CUSTOMS DOCUMENTATION CHECKLIST:
- Cargo Manifest
- Bill of Lading
- Commercial Invoice (for cargo)
- Packing List
- Certificate of Origin (if required)
- Import/Export Licenses (if applicable)
- Ship Stores Declaration
- Crew Effects Declaration
- Bonded Stores List

Contact your local shipping agent for current customs procedures and requirements.
"""
        customs_doc = Document(
            page_content=customs_content,
            metadata={
                **base_metadata,
                "document_type": "customs_documentation",
            },
        )
        documents_by_collection["customs_documentation"].append(customs_doc)

        # 4. Regional Requirements (for ports with specific regional regs)
        if (
            "ECA" in port.get("regulations", "")
            or "SECA" in port.get("regulations", "")
            or "MRV" in port.get("regulations", "")
            or "CARB" in port.get("regulations", "")
        ):
            regional_content = f"""
REGIONAL ENVIRONMENTAL REQUIREMENTS: {port_name} ({port_code})
Country: {country}
Region: {region}

"""
            regs = port.get("regulations", "")

            if "SECA" in regs or "ECA" in regs:
                regional_content += """
EMISSION CONTROL AREA (ECA) REQUIREMENTS:
- Maximum sulphur content in fuel: 0.1% (1000 ppm)
- Applies to all fuel used within ECA boundaries
- Fuel changeover must be documented in Oil Record Book
- Fuel samples may be taken for verification
- Non-compliance subject to detention and penalties

"""
            if "NECA" in regs:
                regional_content += """
NITROGEN EMISSION CONTROL AREA (NECA) REQUIREMENTS:
- Tier III NOx standards for vessels built after 2021
- Applies in North Sea and Baltic Sea
- SCR or EGR systems may be required
- Technical File verification during PSC

"""
            if "MRV" in regs:
                regional_content += """
EU MRV (MONITORING, REPORTING, VERIFICATION) REQUIREMENTS:
- CO2 emissions monitoring and reporting mandatory
- Applies to vessels over 5000 GT calling at EU ports
- Verified emissions report must be carried on board
- Document of Compliance required from accredited verifier
- Non-compliance results in port state action

"""
            if "CARB" in regs:
                regional_content += """
CALIFORNIA AIR RESOURCES BOARD (CARB) REQUIREMENTS:
- At-Berth Regulation: Shore power OR equivalent emission reduction
- Ocean-Going Vessel fuel requirements: 0.1% sulphur within 24nm
- Compliance documentation must be available
- Fuel switching records required
- Non-compliance subject to significant penalties

"""
            regional_doc = Document(
                page_content=regional_content,
                metadata={
                    **base_metadata,
                    "document_type": "regional_requirements",
                },
            )
            documents_by_collection["regional_requirements"].append(regional_doc)

    return documents_by_collection


def create_imo_convention_summaries() -> list[Document]:
    """Create summary documents for key IMO conventions."""
    conventions = [
        {
            "name": "SOLAS",
            "full_name": "International Convention for the Safety of Life at Sea",
            "content": """
SOLAS - INTERNATIONAL CONVENTION FOR THE SAFETY OF LIFE AT SEA

OVERVIEW:
SOLAS is the most important international treaty concerning the safety of merchant ships.
The current version is SOLAS 1974, as amended.

KEY CHAPTERS:
I - General Provisions
II-1 - Construction: Subdivision and stability, machinery and electrical installations
II-2 - Fire protection, fire detection and fire extinction
III - Life-saving appliances and arrangements
IV - Radio communications
V - Safety of navigation
VI - Carriage of cargoes
VII - Carriage of dangerous goods
VIII - Nuclear ships
IX - Management for safe operation (ISM Code)
X - Safety measures for high-speed craft
XI-1 - Special measures to enhance maritime safety
XI-2 - Special measures to enhance maritime security (ISPS Code)
XII - Additional safety measures for bulk carriers
XIII - Verification of compliance
XIV - Safety measures for ships operating in polar waters (Polar Code)

REQUIRED CERTIFICATES:
- Passenger Ship Safety Certificate
- Cargo Ship Safety Construction Certificate
- Cargo Ship Safety Equipment Certificate
- Cargo Ship Safety Radio Certificate
- Safety Management Certificate (SMC)
- International Ship Security Certificate (ISSC)

APPLICABILITY:
Applies to ships engaged in international voyages:
- Passenger ships (all sizes)
- Cargo ships of 500 GT and above
""",
        },
        {
            "name": "MARPOL",
            "full_name": "International Convention for the Prevention of Pollution from Ships",
            "content": """
MARPOL - INTERNATIONAL CONVENTION FOR THE PREVENTION OF POLLUTION FROM SHIPS

OVERVIEW:
MARPOL is the main international convention covering prevention of pollution of the marine
environment by ships from operational or accidental causes.

ANNEXES:
Annex I - Prevention of pollution by oil
Annex II - Control of pollution by noxious liquid substances
Annex III - Prevention of pollution by harmful substances in packaged form
Annex IV - Prevention of pollution by sewage
Annex V - Prevention of pollution by garbage
Annex VI - Prevention of air pollution from ships

REQUIRED CERTIFICATES:
- International Oil Pollution Prevention (IOPP) Certificate
- International Pollution Prevention Certificate for Noxious Liquid Substances
- International Air Pollution Prevention (IAPP) Certificate
- International Energy Efficiency Certificate (IEE)
- Statement of Compliance - Fuel Oil Consumption Reporting

KEY REQUIREMENTS:
- Oil Record Book maintenance
- Garbage Record Book
- Ballast Water Record Book
- Oily Water Separator (15 ppm)
- Shipboard Oil Pollution Emergency Plan (SOPEP)
- Shipboard Marine Pollution Emergency Plan (SMPEP)

SPECIAL AREAS:
Certain sea areas have stricter discharge requirements including:
- Mediterranean Sea
- Baltic Sea
- Black Sea
- Red Sea
- North Sea
- Antarctic Area
""",
        },
        {
            "name": "STCW",
            "full_name": "International Convention on Standards of Training, Certification and Watchkeeping for Seafarers",
            "content": """
STCW - STANDARDS OF TRAINING, CERTIFICATION AND WATCHKEEPING FOR SEAFARERS

OVERVIEW:
STCW sets qualification standards for masters, officers, and watch personnel on seagoing
merchant ships. The current version includes the 2010 Manila Amendments.

KEY REQUIREMENTS:
- Minimum standards for training and certification
- Basic safety training for all seafarers
- Specialized training for specific vessel types
- Rest hour requirements
- Drug and alcohol policies

CERTIFICATES REQUIRED:
- Certificate of Competency (CoC) for officers
- Certificate of Proficiency (CoP) for ratings
- GMDSS Radio Operator Certificate
- Basic Safety Training (BST)
- Advanced Fire Fighting
- Medical First Aid / Medical Care
- Proficiency in Survival Craft
- Security Awareness / Security Duties

SPECIAL CERTIFICATES:
- Tanker familiarization
- Oil/Chemical/Gas tanker specialized training
- Passenger ship safety training
- High Speed Craft certification
- Dynamic Positioning certification
- Polar waters training (Polar Code)

REST HOURS:
- Minimum 10 hours rest in any 24-hour period
- Minimum 77 hours rest in any 7-day period
- Rest may be divided into no more than 2 periods
- One period must be at least 6 hours

RECORDS:
- Hours of rest records must be maintained
- Records available for PSC inspection
- Non-compliance is a detainable deficiency
""",
        },
        {
            "name": "MLC",
            "full_name": "Maritime Labour Convention, 2006",
            "content": """
MLC 2006 - MARITIME LABOUR CONVENTION

OVERVIEW:
MLC 2006 is the fourth pillar of international maritime regulation, alongside SOLAS, MARPOL,
and STCW. It establishes minimum working and living standards for seafarers.

APPLICABILITY:
- Ships of 500 GT and above engaged in international voyages
- Ships of 500 GT and above flying the flag of a member state

KEY AREAS:
Title 1 - Minimum requirements for seafarers to work on a ship
Title 2 - Conditions of employment
Title 3 - Accommodation, recreational facilities, food and catering
Title 4 - Health protection, medical care, welfare and social security
Title 5 - Compliance and enforcement

REQUIRED DOCUMENTS:
- Maritime Labour Certificate (MLC)
- Declaration of Maritime Labour Compliance (DMLC) Part I and II
- Seafarer Employment Agreements (SEA)
- Records of hours of work/rest

KEY REQUIREMENTS:
- Minimum age (16 years, 18 for night work/hazardous)
- Medical fitness certificates
- Training and qualifications
- Written employment agreements
- Payment of wages (monthly, in full)
- Hours of work and rest
- Repatriation rights
- Accommodation standards
- Food and catering standards
- Medical care on board
- Shipowner liability
- Complaint procedures

PSC INSPECTION:
- MLC items are commonly inspected
- Crew interviews conducted
- Accommodation inspected
- Employment records reviewed
- Deficiencies can lead to detention
""",
        },
        {
            "name": "ISM Code",
            "full_name": "International Safety Management Code",
            "content": """
ISM CODE - INTERNATIONAL SAFETY MANAGEMENT CODE

OVERVIEW:
The ISM Code provides an international standard for the safe management and operation of
ships and for pollution prevention. It is mandatory under SOLAS Chapter IX.

OBJECTIVES:
- Ensure safety at sea
- Prevent human injury or loss of life
- Avoid damage to the environment and property

KEY ELEMENTS:
1. Safety and Environmental Protection Policy
2. Company Responsibilities and Authority
3. Designated Person Ashore (DPA)
4. Master's Responsibility and Authority
5. Resources and Personnel
6. Shipboard Operations Plans and Procedures
7. Emergency Preparedness
8. Reports and Analysis of Non-conformities, Accidents, and Hazardous Occurrences
9. Maintenance of Ship and Equipment
10. Documentation
11. Company Verification, Review, and Evaluation
12. Certification and Verification

REQUIRED CERTIFICATES:
- Document of Compliance (DOC) - issued to the company
- Safety Management Certificate (SMC) - issued to the ship

VALIDITY:
- DOC: 5 years with annual verification
- SMC: 5 years with intermediate verification (between 2nd and 3rd anniversary)

KEY REQUIREMENTS:
- Safety Management System (SMS) manual
- Procedures for key shipboard operations
- Emergency procedures and drills
- Internal audits
- Management review
- Objective evidence of compliance
""",
        },
        {
            "name": "ISPS Code",
            "full_name": "International Ship and Port Facility Security Code",
            "content": """
ISPS CODE - INTERNATIONAL SHIP AND PORT FACILITY SECURITY CODE

OVERVIEW:
The ISPS Code is a comprehensive set of measures to enhance the security of ships and port
facilities, developed in response to perceived threats after the 9/11 attacks.
It is mandatory under SOLAS Chapter XI-2.

APPLICABILITY:
- Passenger ships on international voyages
- Cargo ships of 500 GT and above on international voyages
- Mobile offshore drilling units
- Port facilities serving such ships

SECURITY LEVELS:
Level 1 - Normal: Minimum protective security measures maintained at all times
Level 2 - Heightened: Additional protective security measures for a period of time
Level 3 - Exceptional: Further specific protective security measures for a limited period

KEY REQUIREMENTS FOR SHIPS:
- Ship Security Plan (SSP) approved by flag state
- Ship Security Officer (SSO) designated
- Company Security Officer (CSO) designated
- Ship Security Assessment
- Security drills and exercises
- Declaration of Security (DOS) with port facilities
- Security records maintained

REQUIRED CERTIFICATE:
- International Ship Security Certificate (ISSC)
- Valid for 5 years with intermediate verification

CONTINUOUS SYNOPSIS RECORD (CSR):
- Required under SOLAS XI-1
- History of the ship (name, flag, IMO number, etc.)
- Must be kept on board and updated

PORT FACILITY SECURITY:
- Port Facility Security Plan (PFSP)
- Port Facility Security Officer (PFSO)
- Security equipment and procedures
- Access control
- Monitoring and surveillance

DECLARATION OF SECURITY (DOS):
- Agreement between ship and port facility
- Required when there is a security concern
- Documents security measures to be implemented
""",
        },
    ]

    documents = []
    for conv in conventions:
        doc = Document(
            page_content=conv["content"],
            metadata={
                "source_convention": conv["name"],
                "convention_full_name": conv["full_name"],
                "document_type": "convention_summary",
                "source": "imo_convention_loader",
            },
        )
        documents.append(doc)

    return documents


def main():
    """Main function to load port data into the knowledge base."""
    logger.info("=" * 60)
    logger.info("Port Data Knowledge Base Loader")
    logger.info("=" * 60)

    # Initialize knowledge base
    logger.info("Initializing knowledge base...")
    kb = get_maritime_knowledge_base()

    if kb.embeddings is None:
        logger.error("Embeddings not initialized. Check your Google API key.")
        return

    # Show current stats
    stats = kb.get_collection_stats()
    logger.info(f"Current collection stats: {stats}")

    # Create port documents
    logger.info("\nCreating port documents...")
    documents_by_collection = create_port_documents()

    # Create IMO convention summaries
    logger.info("Creating IMO convention summaries...")
    imo_docs = create_imo_convention_summaries()
    documents_by_collection["imo_conventions"].extend(imo_docs)

    # Count documents
    total_docs = sum(len(docs) for docs in documents_by_collection.values())
    logger.info(f"\nTotal documents to load: {total_docs}")
    for collection, docs in documents_by_collection.items():
        logger.info(f"  {collection}: {len(docs)} documents")

    # Add documents to collections
    total_added = 0
    for collection_name, documents in documents_by_collection.items():
        if documents:
            logger.info(f"\nAdding {len(documents)} documents to {collection_name}...")
            count = kb.add_documents(collection_name, documents)
            total_added += count
            logger.info(f"  Added {count} documents")

    # Show final stats
    logger.info("\n" + "=" * 60)
    logger.info("Loading complete!")
    final_stats = kb.get_collection_stats()
    logger.info(f"Final collection stats: {final_stats}")
    logger.info(f"Total documents added: {total_added}")

    # List ports loaded
    logger.info("\nPorts loaded:")
    for port in MAJOR_PORTS_DATA:
        logger.info(f"  {port['port_code']}: {port['port_name']}, {port['country']}")


if __name__ == "__main__":
    main()
