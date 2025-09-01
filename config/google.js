// Google Service Account Auth (ESM)
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;

export function getServiceAccountClient(scopes = [
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive',
]) {
	const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
	return new google.auth.GoogleAuth({
		credentials,
		scopes,
	});
}
