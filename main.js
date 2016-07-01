const request = require('request');
const fs = require('fs');

require('dotenv').config();

const api_key = process.env.API_KEY;
const domain = process.env.DOMAIN;
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
const schedule = require('node-schedule');

const url = process.env.TREEHOUSE_ADMIN_URL;
const degrees = ['Full Stack', 'Front End'];
const myDegrees = ['Full Stack'];

fs.readdir('./', function(err, files) {
  files.indexOf('projects.json') === -1 ?
    fs.writeFileSync('projects.json', '{}') : null;

  setInterval(function() {
    fs.readFile('projects.json', 'utf8', (err, file) => {
      scrapeAndAlert(file);
    });

    function scrapeAndAlert (projectsFile) {
      projectsFile = JSON.parse(projectsFile.toString());
      if (typeof projectsFile !== 'object') {
        projectsFile = {};
      }

      request({url: url}, (error, response, body) => {
        if(body !== undefined) {
          degrees.forEach(function(degree) {
            let idxStart, idxEnd;

            let projects = {};
            let projectsExist = body.indexOf(degree) !== -1;

            if (projectsExist) {
              while (body.indexOf(degree) !== -1) {
                let currStart, currEnd, endIdx;
                let project = {};
                let projectIdx = body.indexOf(degree);

                endIdx = body.indexOf('</td>', projectIdx);

                currEnd = endIdx;
                currStart = body.lastIndexOf('<td>', projectIdx);
                project.degree = body.slice(currStart + 4, currEnd).trim();

                currEnd = body.lastIndexOf('</td>', currStart);
                currStart = body.lastIndexOf('<td>', currEnd);
                project.student = body.slice(currStart + 4, currEnd);

                currEnd = body.lastIndexOf('<', body.lastIndexOf('b class="caret">', currStart));
                currStart = body.lastIndexOf('>', currEnd) + 2;
                project.project = body.slice(currStart, currEnd).trim();

                project.date = new Date();

                projects[project.project + project.student + project.degree] = project;
                body = body.slice(endIdx);
              }

              for (let key in projects) {
                if (projectsFile[key] === undefined) {
                  projectsFile[key] = projects[key];

                  console.log(projects[key]);

                  let alert = false;

                  myDegrees.forEach(function (myDegree) {
                    projects[key].degree.indexOf(myDegree) !== -1 ? alert = true : null;
                  });

                  if (alert) {
                    let data = {
                      from: 'Me, Myself, and I <' + process.env.FROM_EMAIL + '>',
                      to: '' + process.env.TO_EMAIL + '',
                      subject: projects[key].degree + ' Project Available, GET IT',
                      text: 'PROJECT: ' + projects[key].project + '\nhttps://teamtreehouse.com/admin/degree_services_dashboard/reviews'
                    };

                    mailgun.messages().send(data, function (error, body) {
                      console.log(body);
                    });
                  }
                }
              }
              fs.writeFileSync('projects.json', JSON.stringify(projectsFile));
            }
          });
        }
      });
    }
  }, 300000);
});
