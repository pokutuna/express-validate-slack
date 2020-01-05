/// <reference types="node" />
import { Request, Response, RequestHandler } from "express";
export declare function rawBodyKeeper(req: Request, res: Response, buf: Buffer): void;
export default function verifySlack(signingSecret: string): RequestHandler;
