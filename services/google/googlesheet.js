
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { getServiceAccountClient } from '../../config/google.js';

dotenv.config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = 'Test Run';

// Generates a random string for the id
function generateRandomId(length = 12) {
	return Math.random().toString(36).substring(2, 2 + length);
}

// Helper to get sheetId by name
async function getSheetIdByName(sheetName, sheetsApi) {
	const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
	const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
	if (!sheet) throw new Error(`Sheet tab "${sheetName}" not found`);
	return sheet.properties.sheetId;
}

// Insert header row if not present
export async function ensureHeaderRow() {
	const authClient = await getServiceAccountClient();
	const sheetsApi = google.sheets({ version: 'v4', auth: authClient });
	const range = `${SHEET_TAB}!A1:D1`;
	const header = ['id', 'from', 'message', 'created_at'];
	// Check if header exists
	const res = await sheetsApi.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range,
	});
	const values = res.data.values;
	if (!values || values.length === 0 || values[0].join() !== header.join()) {
		await sheetsApi.spreadsheets.values.update({
			spreadsheetId: SHEET_ID,
			range,
			valueInputOption: 'RAW',
			requestBody: { values: [header] },
		});
	}
}

// Apply alternating row colors (banding) and bold text under 'message' column
export async function styleSheetRows() {
	const authClient = await getServiceAccountClient();
	const sheetsApi = google.sheets({ version: 'v4', auth: authClient });

	// Get all values to determine how many rows exist
	const res = await sheetsApi.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: `${SHEET_TAB}!A:D`,
	});
	const numRows = res.data.values ? res.data.values.length : 0;
	if (numRows < 2) return; // only header present

	const sheetId = await getSheetIdByName(SHEET_TAB, sheetsApi);

		// Build per-row formatting requests (background color + bold for message column)
		const requests = [];
		for (let i = 1; i < numRows; i++) {
			const color = (i % 2 === 1)
				? { red: 0.88, green: 1, blue: 0.88 } // light green
				: { red: 0.88, green: 0.92, blue: 1 }; // light blue

			// background for columns A-D
			requests.push({
				repeatCell: {
					range: {
						sheetId,
						startRowIndex: i,
						endRowIndex: i + 1,
						startColumnIndex: 0,
						endColumnIndex: 4,
					},
					cell: { userEnteredFormat: { backgroundColor: color } },
					fields: 'userEnteredFormat.backgroundColor',
				},
			});

			// bold text for 'message' column (C)
			requests.push({
				repeatCell: {
					range: {
						sheetId,
						startRowIndex: i,
						endRowIndex: i + 1,
						startColumnIndex: 2,
						endColumnIndex: 3,
					},
					cell: { userEnteredFormat: { textFormat: { bold: true } } },
					fields: 'userEnteredFormat.textFormat.bold',
				},
			});
		}

		if (requests.length === 0) return;
		await sheetsApi.spreadsheets.batchUpdate({
			spreadsheetId: SHEET_ID,
			requestBody: { requests },
		});
}

// Insert a row into the Test Run tab and re-style sheet
export async function insertRow({ from, message }) {
	const authClient = await getServiceAccountClient();
	const sheetsApi = google.sheets({ version: 'v4', auth: authClient });
	const id = generateRandomId();
	const created_at = new Date().toISOString();
	const row = [id, from, message, created_at];

	// Ensure header exists so we write below it
	await ensureHeaderRow();

	// Read data rows (A2:D) to find next empty row index
	const all = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_TAB}!A2:D` });
	const dataRows = all.data.values || [];
	const nextRowIndex = 2 + dataRows.length; // row number to write to (1-based)

	console.log(`Writing to exact range: ${SHEET_TAB}!A${nextRowIndex}:D${nextRowIndex} (data rows: ${dataRows.length})`);

	const updateRes = await sheetsApi.spreadsheets.values.update({
		spreadsheetId: SHEET_ID,
		range: `${SHEET_TAB}!A${nextRowIndex}:D${nextRowIndex}`,
		valueInputOption: 'USER_ENTERED',
		requestBody: { values: [row] },
	});

	// console.log('Update HTTP:', updateRes.status, updateRes.statusText);
	// console.log('Update data:', JSON.stringify(updateRes.data, null, 2));

	// Reapply styling so new row receives formatting
	await styleSheetRows();
	return row;
}

// // If run directly, add header and style the sheet
// if (import.meta.url === `file://${process.argv[1]}`) {
// 	const argv = process.argv.slice(2);
// 	if (argv[0] === 'append') {
// 		const from = argv[1] || 'cli@example.com';
// 		const message = argv[2] || 'Sample message from CLI';
// 		insertRow({ from, message })
// 			.then(row => {
// 				console.log('Inserted row:', row);
// 			})
// 			.catch(err => {
// 				console.error('Error inserting row:', err);
// 				process.exit(1);
// 			});
// 	} else {
// 		ensureHeaderRow()
// 			.then(() => styleSheetRows())
// 			.then(() => {
// 				console.log('Header ensured and rows styled in the sheet.');
// 			})
// 			.catch(err => {
// 				console.error('Error ensuring header or styling rows:', err);
// 				process.exit(1);
// 			});
// 	}
// }
