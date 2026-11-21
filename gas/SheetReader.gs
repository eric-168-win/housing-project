/**
 * Reads and validates rows from the rooms sheet tab.
 * @return {{rooms: Array<Object>, imagePaths: string[]}}
 */
function readRoomsFromSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_TAB);
  if (!sheet) {
    throw new Error('Sheet tab "' + CONFIG.SHEET_TAB + '" not found.');
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    throw new Error('Sheet has no data rows (need header + at least one room).');
  }

  var headers = values[0].map(function (h) {
    return String(h || '').trim().toLowerCase();
  });

  CONFIG.REQUIRED_HEADERS.forEach(function (required) {
    if (headers.indexOf(required) === -1) {
      throw new Error('Missing required header: "' + required + '". Found: ' + headers.join(', '));
    }
  });

  var idx = {
    district: headers.indexOf('district'),
    building: headers.indexOf('building'),
    codeName: headers.indexOf('code name'),
    rent: headers.indexOf('rent'),
    image: headers.indexOf('image'),
    youtube: headers.indexOf('youtube link')
  };

  var rooms = [];
  var imagePathSet = {};

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var building = String(row[idx.building] || '').trim();
    var district = String(row[idx.district] || '').trim();
    var codeName = String(row[idx.codeName] || '').trim();
    var rentRaw = row[idx.rent];
    var imageRaw = String(row[idx.image] || '').trim();
    var youtube = String(row[idx.youtube] || '').trim();

    if (
      !building &&
      !district &&
      !codeName &&
      !imageRaw &&
      !youtube &&
      (rentRaw === '' || rentRaw === null || rentRaw === undefined)
    ) {
      continue; // skip blank rows
    }
    if (!building) {
      throw new Error('Row ' + (r + 1) + ': building is required.');
    }

    var images = imageRaw
      ? imageRaw
          .split(';')
          .map(function (p) {
            return String(p).trim().replace(/^\/+/, '');
          })
          .filter(function (p) {
            return p.length > 0;
          })
      : [];

    images.forEach(function (p) {
      imagePathSet[p] = true;
    });

    var rent = rentRaw;
    if (typeof rent === 'string' && rent.trim() !== '' && !isNaN(Number(rent))) {
      rent = Number(rent);
    }

    rooms.push({
      district: district,
      building: building,
      'code name': codeName,
      rent: rent,
      image: images,
      'youtube link': youtube
    });
  }

  return {
    rooms: rooms,
    imagePaths: Object.keys(imagePathSet)
  };
}
