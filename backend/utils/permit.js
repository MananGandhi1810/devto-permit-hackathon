import { Permit } from "permitio";

const permit = new Permit({
    pdp: process.env.PERMIT_PDP,
    token: process.env.PERMIT_TOKEN,
});

export default permit;
