const { QueryRequest, PerChainQueryRequest, EthCallQueryRequest, QueryProxyMock } = require("@wormhole-foundation/wormhole-query-sdk");
const axios = require("axios");
const ethers = require("ethers");

const API_KEY = process.env["WORMHOLE_API_KEY"];
const QUERY_URL = "https://query.wormhole.com/v1/query";
const ETH_RPC = 'https://ethereum.publicnode.com';

const multicallAbi = [
    "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) external payable returns (tuple(bool success, bytes returnData)[])"
];

function encodeMulticallData() {
    const multicallInterface = new ethers.Interface(multicallAbi);


    const calls = [
        {
            target: "0xcA11bde05977b3631167028862bE2a173976CA11",
            allowFailure: true,
            callData: "0x3408e470"
        }
    ];

    const encodedData = multicallInterface.encodeFunctionData("aggregate3", [calls]);

    return {
        to: "0xcA11bde05977b3631167028862bE2a173976CA11",
        data: encodedData
    };
}

async function main() {
    const blockTag = await getLatestBlockNumber();
    console.log({ blockTag })

    const callData = encodeMulticallData();

    console.log({ callData })

    const request = new QueryRequest(
        0, // Nonce
        [
            new PerChainQueryRequest(
                2, // Ethereum Wormhole Chain ID
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
    ).data;

    return response;
}

async function getLatestBlockNumber() {
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
