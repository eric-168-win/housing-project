/**
 * Adds the custom menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('住房項目')
    .addItem('update rooms data', 'updateRoomsData')
    .addToUi();
}
