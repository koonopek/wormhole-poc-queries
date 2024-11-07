const { QueryRequest, PerChainQueryRequest, EthCallQueryRequest, QueryProxyMock } = require("@wormhole-foundation/wormhole-query-sdk");
const axios = require("axios");

const API_KEY = process.env["API_KEY"];
const QUERY_URL = "https://testnet.query.wormhole.com/v1/query";
const ETH_RPC = 'https://ethereum.publicnode.com';

async function main() {

    const blockTag = await getLatestBlockNumber();
    console.log({ blockTag })

    const callData = { to: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e", data: "0xc6a5026a000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000f951e335afb289353dc249e82926178eac7ded7800000000000000000000000000000000000000000000000031362a46ffe220d500000000000000000000000000000000000000000000000000000000000001f40000000000000000000000000000000000000000000000000000000000000000" };

    const request = new QueryRequest(
        0, // Nonce
        [
            new PerChainQueryRequest(
                1, // Ethereum Wormhole Chain ID
                new EthCallQueryRequest(blockTag, [callData])
            ),
        ]
    );

    console.log("expected output", await ethCall(callData, blockTag));

    const response = await sendQuery(request);

    console.log(response.status, response.data);
}

async function sendQuery(request) {
    const serialized = request.serialize();
    const proxyResponse = await axios.post(
        QUERY_URL,
        {
            bytes: Buffer.from(serialized).toString('hex'),
        },
        { headers: { 'X-API-Key': API_KEY } }
    );

    return proxyResponse;
}

async function ethCall({ to, data }, blockTag) {
    const response = (
        await axios.post(ETH_RPC, {
            method: 'eth_call',
            params: [{ to, input: data }, blockTag],
            id: 1,
            jsonrpc: '2.0',
        })
    ).data?.result;

    return response;
}

async function getLatestBlockNumber() {
    const rpc = 'https://ethereum.publicnode.com';
    const latestBlock = (
        await axios.post(ETH_RPC, {
            method: 'eth_getBlockByNumber',
            params: ['latest', false],
            id: 1,
            jsonrpc: '2.0',
        })
    ).data?.result?.number;

    return latestBlock;
}

main();