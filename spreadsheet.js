const { GoogleSpreadsheet } = require("google-spreadsheet");
const key = require("./server-key.json");

const CREDENTIALS_ID = 0;
const LEADERBOARD_ID = 1618630879;
const STATISTICS_ID = 1981752792;
const GROUPS_ID = [];
const puzzleNames = [
  "are_you_satisfactory_enough",
  "qet",
  "cca",
  "metapuzzle_10",
  "utown",
  "biz_fos",
  "biz_soc",
  "engin_yst",
  "fass_engin",
  "fass_soc",
  "fos_yst",
  "modreg",
  "instagram",
  "waiting_for_d2",
  "the_committee",
  "qet_marking",
  "mala_stalls",
  "music_box",
  "things",
  "dumb_ways_to_die",
  "cat_emojis",
  "solfa",
  "classical_composers",
  "pokemon_go",
  "mrt_tracing",
  "what_does_the_owl_say",
  "polypotions",
  "burkina_faso",
  "football",
  "world_politics",
  "hieroglyphs",
  "world_history",
  "i_am_groot",
  "central_library",
  "multilingual_puns",
  "leftover_dice",
  "character_double",
  "covid_19",
  "the_heist",
  "true_or_false",
  "framing_differences",
  "imdb",
  "recipes",
  "travelling",
  "refresh",
  "wifi_ssid",
  "origami_startup",
  "omr",
  "periodic_table",
  "12_pictures",
  "protein_geeks",
  "emission_spectra",
  "anything",
];

async function init() {
  const doc = new GoogleSpreadsheet(
    "1vYE0U_GbDKHW5ZZsUqt4d6-3UOYeehwM8tWS5VQxTbE"
  );
  await doc.useServiceAccountAuth(key);
  await doc.loadInfo();
  return doc;
}

async function total(doc) {
  const sheet = doc.sheetsById[STATISTICS_ID];
  await sheet.loadCells();
  return sheet.getCellByA1("B1").value;
}

async function accessSheet(sheet, total) {
  await sheet.loadHeaderRow();
  await sheet.loadCells();
  const rows = await sheet.getRows({ offset: 0, limit: total });
  const headers = sheet.headerValues;

  let JSON = [];
  for (const row of rows) {
    let obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[headers[i]];
    }
    JSON.push(obj);
  }
  return JSON;
}

async function accessCredentials() {
  const doc = await init();
  const totalGroups = await total(doc);
  const sheet = doc.sheetsById[CREDENTIALS_ID];
  return accessSheet(sheet, totalGroups);
}

async function accessLeaderboard() {
  const doc = await init();
  const totalGroups = await total(doc);
  const sheet = doc.sheetsById[LEADERBOARD_ID];
  return accessSheet(sheet, totalGroups);
}

// Saves the newly registered group to the database and initialises a group sheet for the group
async function save(newGroup) {
  const doc = await init();
  const totalGroups = await total(doc);
  newGroup.ID = totalGroups + 1;
  await doc.sheetsById[CREDENTIALS_ID].addRow(newGroup);

  const newSheet = await doc.addSheet({
    title: `Group ${newGroup.ID}`,
    index: 2 + newGroup.ID,
  });
  await newSheet.setHeaderRow(["Puzzle", "Solved"]);
  for (let i = 0; i < puzzleNames.length; i++) {
    await newSheet.addRow({ Puzzle: puzzleNames[i], Solved: 0 });
  }

  GROUPS_ID[newGroup.ID - 1] = newSheet.sheetId;

  const sheet = await doc.sheetsById[LEADERBOARD_ID];
  await sheet.loadCells("C1:C30");
  sheet.getCell(
    newGroup.ID,
    2
  ).formula = `=IF(ISBLANK(A:A),"",0 + SUM(\'Group ${newGroup.ID}\'!B:B))`;
  await sheet.saveUpdatedCells();
  return newGroup;
}

// Checks the group login details
async function verify(group) {
  const JSON = await accessCredentials();
  return JSON.some(
    (value) => group.Name === value.Name && group.Password === value.Password
  );
}

// Checks if the group is already registered
async function isRegistered(group) {
  const JSON = await accessCredentials();
  return JSON.some((value) => group.Name === value.Name);
}

// Updates the score of the group once the puzzle with id puzzleName is solved.
// Returns true if the puzzle is already solved, false otherwise.
async function solved(puzzleName, group) {
  const JSON = await accessCredentials();

  // Find group in the Groups sheet
  let i = 0;
  let groupFound = false;
  while (i < JSON.length && !groupFound) {
    groupFound = JSON[i].Name === group.Name;
    if (!groupFound) {
      i++;
    }
  }

  // Find group sheet and find the correct entry to update
  if (groupFound) {
    const groupSheet = await accessGroup(i + 1);
    const rows = await groupSheet.getRows();

    let j = 0;
    let puzzleFound = false;
    while (j < puzzleNames.length && !puzzleFound) {
      puzzleFound = rows[j].Puzzle === puzzleName;
      if (!puzzleFound) {
        j++;
      }
    }

    if (puzzleFound) {
      if (rows[j].Solved === 1) {
        return true;
      } else {
        rows[j].Solved = 1;
        await rows[j].save();
        return false;
      }
    }
  }
}

// Gets the group sheet by id
async function accessGroup(groupId) {
  const doc = await init();
  return await doc.sheetsById[GROUPS_ID[groupId - 1]];
}

module.exports = {
  credentials: accessCredentials,
  leaderboard: accessLeaderboard,
  save: save,
  verify: verify,
  authenticate: isRegistered,
  solved: solved,
};
