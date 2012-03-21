var assert = require('assert'),
    fs = require('fs'),
    net = require('net'),
    path = require('path'),
    tls = require('tls'),
    vows = require('vows'),
    nssocket = require('../lib/nssocket');

var fixturesDir = path.join(__dirname, 'fixtures');


function getBatch() {
    var args = Array.prototype.slice.call(arguments),
        serverOpts = {
            requestCert:true,
            type:"tls",
            key:fs.readFileSync(path.join(fixturesDir, 'server-key.pem')),
            cert:fs.readFileSync(path.join(fixturesDir, 'server-cert.pem')),
            ca:fs.readFileSync(path.join(fixturesDir, 'client-cert.pem'))
        },
        clientOpts = {
            type:"tls",
            key:fs.readFileSync(path.join(fixturesDir, 'client-key.pem')),
            cert:fs.readFileSync(path.join(fixturesDir, 'client-cert.pem')),
            ca:fs.readFileSync(path.join(fixturesDir, 'server-cert.pem'))
        },
        res = {};

    return {
        "the createServer() method":{
            topic:function () {
                var outbound = new nssocket.NsSocket(clientOpts),
                    server = nssocket.createServer(serverOpts, this.callback.bind(null, null, outbound));

                server.listen.apply(server, args.concat(function () {
                    outbound.connect.apply(outbound, args);
                }));
            },
            "should send events to client":{
                topic:function (client, server) {
                    client.on(['data', 'here', 'is'], this.callback.bind(client, null));
                    server.send(['here', 'is'], 'something.');
                },
                "should handle namespaced events":function (_, data) {
                    assert.isArray(this.event);
                    assert.lengthOf(this.event, 3);
                    assert.isString(this.event[0]);
                    assert.isString(this.event[1]);
                    assert.isString(this.event[2]);
                    assert.isString(data);
                    assert.equal(this.event[0], 'data');
                    assert.equal(this.event[1], 'here');
                    assert.equal(this.event[2], 'is');
                    assert.equal(data, 'something.');
                }
            },
            "should receive events from the client":{
                topic:function (client, server) {
                    server.on(['data', 'here', 'is'], this.callback.bind(server, null));
                    client.send(['here', 'is'], 'something.');
                },
                "should handle namespaced events":function (_, data) {
                    assert.isArray(this.event);
                    assert.lengthOf(this.event, 3);
                    assert.isString(this.event[0]);
                    assert.isString(this.event[1]);
                    assert.isString(this.event[2]);
                    assert.isString(data);
                    assert.equal(this.event[0], 'data');
                    assert.equal(this.event[1], 'here');
                    assert.equal(this.event[2], 'is');
                    assert.equal(data, 'something.');
                }
            }
        }
    };
}

var PORT = 51100,
    HOST = "127.0.0.1",
    PIPE = path.join(__dirname, "fixtures", "nssocket-tls.sock"),
    HOSTNAME = "localhost";

vows.describe('nssocket/create-tls-server').addBatch({
    "When using NsSocket":{
        "with `(PORT)` argument":getBatch(PORT),
        "with `(PORT, HOST)` arguments":getBatch(PORT + 1, HOST),
        "with `(PORT, HOSTNAME)` argument":getBatch(PORT + 2, HOSTNAME),
        "with `(PIPE)` argument":getBatch(PIPE)
    }
}).addBatch({
        "When tests are finished":{
            "`PIPE` should be removed":function () {
                fs.unlinkSync(PIPE);
            }
        }
    }).export(module);

