export interface SmsGatewayRecord {
    id: string;
    api_key_id: string | null;
    name: string;
    phone_number: string | null;
    gateway_token_hash: string;
    is_online: boolean;
    last_seen_at: string | null;
    last_heartbeat_at: string | null;
    created_at: string;
}
export declare function generateGatewayToken(gatewayId: string): string;
export declare function createGateway(opts: {
    apiKeyId?: string;
    name?: string;
    phoneNumber?: string;
}): Promise<{
    gateway: SmsGatewayRecord;
    rawToken: string;
}>;
export declare function verifyGatewayToken(rawToken: string): Promise<SmsGatewayRecord | null>;
export declare function touchGatewayHeartbeat(gatewayId: string): Promise<void>;
export declare function setGatewayOfflineIfStale(gatewayId: string): Promise<void>;
export declare function listGateways(apiKeyId?: string): Promise<SmsGatewayRecord[]>;
export declare function getGatewayById(id: string): Promise<SmsGatewayRecord | null>;
export declare function deleteGateway(id: string): Promise<boolean>;
export declare function rotateGatewayToken(gatewayId: string): Promise<{
    rawToken: string;
}>;
//# sourceMappingURL=smsGatewayService.d.ts.map