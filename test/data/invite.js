const examples = require('sip-message-examples') ;
const SipMessage = require('drachtio-srf').SipMessage;
const SipRequest = require('drachtio-srf').SipRequest;

module.exports = function({from, to, source_address, source_port}) {
  const m = examples('invite');
  const msg = new SipMessage(m);
  const req = new SipRequest(msg, {
    source: 'network',
    source_address: source_address || '127.0.0.1',
    source_port: source_port || 5060,
    protocol: 'udp',
    stackTime: 'na',
    stackTxnId: '0xdeadbeef',
    stackDialogId: '0xdeadbeef'
  });

  return req;
};
