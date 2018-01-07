require('dotenv').config();

const fs              = require('fs');
const cluster         = require('cluster');

if (cluster.isMaster) {
    let processes = require('os').cpus().length;
    if (process.env.WORKER_PROCESSES) {
        processes = parseInt(process.env.WORKER_PROCESSES);
    }
    console.log("Spawning " + processes + " worker processes...");
    for (let i = 0; i < processes; i += 1) {
        cluster.fork();
    }
    // TODO: Consider making master process a worker
} else {
    const express         = require('express');
    const bodyParser      = require('body-parser');
    const http            = require('http');
    const path            = require('path');
    const app             = express();
    const helmet          = require('helmet');

    // preload INI into RAM on bootstrap/fork, everything needs it
    // and we want to avoid synchronous processes in the request pipeline
    const settings        = require('./lib/EGSSettings');
    settings.loadSettings();

    app.set('port', process.env.PORT || 8080);
    app.use(helmet());
    app.use(bodyParser.json());

    // v0/legacy routes
    // XXX abstract
    fs.readdirSync('./controllers/v0/').forEach((jsfile) => {
        let router = express.Router();
        if (jsfile.substr(-3) === '.js') {
            let controller = require('./controllers/v0/' + jsfile);
            controller(router);
        }
        app.use('/v0', router);
    });

    app.get('/', (req, res) => {
        res.json({
            result: 'success'
        });
    })

    http.createServer(app).listen(app.get('port'), () => {
        console.log('Express worker process ' + cluster.worker.id + ' listening on ' + app.get('port'));
    });
}
