import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
const axios = require('axios');
export default class FetchMailsController {
  public async fetchUnreadMails() {
    const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
    // The file token.json stores the user's access and refresh tokens, and is
    // created automatically when the authorization flow completes for the first
    // time.
    const TOKEN_PATH ="D:/SEM 7/NGPWS/Adinos/jiraIssue/token.json"
    const CREDENTIALS_PATH = "D:/SEM 7/NGPWS/Adinos/jiraIssue/client.json"
    
    /**
     * Reads previously authorized credentials from the save file.
     *
     * @return {Promise<OAuth2Client|null>}
     */
    async function loadSavedCredentialsIfExist() {
      try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
      } catch (err) {
        return null;
      }
    }
    
    /**
     * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
     *
     * @param {OAuth2Client} client
     * @return {Promise<void>}
     */
    async function saveCredentials(client) {
      const content = await fs.readFile(CREDENTIALS_PATH);
      const keys = JSON.parse(content);
      const key = keys.installed || keys.web;
      const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
      });
      await fs.writeFile(TOKEN_PATH, payload);
    }
    
    /**
     * Load or request or authorization to call APIs.
     *
     */
    async function authorize() {
      let client = await loadSavedCredentialsIfExist();
      if (client) {
        return client;
      }
      client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });
      if (client.credentials) {
        await saveCredentials(client);
      }
      return client;
    }
    
    /**
     * Lists the labels in the user's account.
     *
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    async function listLabels(auth) {
      const gmail = google.gmail({version: 'v1', auth});
      const res = await gmail.users.labels.list({
        userId: 'me',
      });
      const labels = res.data.labels;
      if (!labels || labels.length === 0) {
        console.log('No labels found.');
        return;
      }
      console.log('Labels:');
      labels.forEach((label) => {
        console.log(`- ${label.name}`);
      });
    }
    async function listUnreadEmails(auth) {
        const gmail = google.gmail({ version: 'v1', auth });
      
        try {
          const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
          });
      
          const messages = res.data.messages;
          if (!messages || messages.length === 0) {
            console.log('No unread emails found.');
            return;
          }
      
          for (const message of messages) {
            if (message.id) {
              const email = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'metadata', 
              });
              console.log(email,'EMAIL')
      
              const emailData = email.data;
              const emailSubject = emailData?.payload.headers.find(header => header.name === 'Subject');
              const subject = emailSubject ? emailSubject.value : 'Subject not found';
      
              const snippet = emailData.snippet;
      
              console.log('Email Subject:', subject);
              console.log('Email Snippet:', snippet);
              console.log('----------------------');

              const jiraIssue = {
                "fields": {
                  // Jira issue fields
                  // You can modify this part to fit your Jira configuration
                  "project": {
                    "key": 'CIT',
                    "id": '10091',
                  },
                  "issuetype": {
                    "name": 'Task', // Change the issue type if needed
                  },
                  "summary": `Gmail Email: ${subject}`,
                  "description": {
                    "content": [
                      {
                        "content": [
                          {
                            "text": `${snippet}`,
                            "type": "text"
                          }
                        ],
                        "type": "paragraph"
                      }
                    ],
                    "type": "doc",
                    "version": 1
                  },
                },
              };
  
              // Set your Jira API base URL and credentials
              const jiraBaseUrl = 'https://ngpems.atlassian.net'; //edit
              const emailAccess = 'monnit.user@ngpwebsmart.com';
              const apiToken = 'ATATT3xFfGF0hQUThIvYl2YDfPJ1uqWkF2BDGYGAXsm2-a8InJEbkh-M02lMaAoUBh7_J9l1ClnaUKnYnMwOL8Amug5zg3voLuBo3vP5OgF4NqWyDiYZHCvuWe2AkTMXBlmWBNkeKQcEcTdfisyjgXXA9hMBZj04FX6BPMCGHsiQ6NprWma7t_k=57AA5FDE'; //edit
  
              try {
                const response = await axios.post(`${jiraBaseUrl}/rest/api/3/issue`, jiraIssue, {
                  headers: {
                    'Authorization': `Basic ${Buffer.from(`${emailAccess}:${apiToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                });
  
                console.log(
                  `Response: ${response.status} ${response.statusText}`
                );
                console.log(response.data);
  
                // Handle the Jira issue creation response as needed
              } catch (error) {
                if (error.response) {
                    console.error('Response data:', error.response.data);
                    console.error('Response status:', error.response.status);
                    console.error('Response headers:', error.response.headers);
                  } else {
                    console.error('Error message:', error.message);
                  }
                // Handle errors
              }
            }
          }
        } catch (err) {
          console.error('An error occurred while fetching unread emails:', err);
        }


      }
      
      
    // authorize().then(listLabels).catch(console.error);
    authorize()
  .then(listUnreadEmails)
  .catch(console.error);
  }
}