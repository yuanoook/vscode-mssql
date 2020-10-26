/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import vscode = require('vscode');
import { IAccount, IAccountKey, IAccountDisplayInfo } from '../models/contracts/azure/accountInterfaces';
import SqlToolsServiceClient from '../languageservice/serviceclient';
import { IAzureSession } from '../models/interfaces';
import Constants = require('../constants/constants');
import VscodeWrapper from '../controllers/vscodeWrapper';
import { AzureController } from './azureController';
import { AccountStore } from './accountStore';
import providerSettings from '../azure/providerSettings';
import { Tenant } from 'ads-adal-library';

export class AccountService {

    private _account: IAccount = undefined;
    private _token = undefined;
    private _isStale: boolean;
    protected readonly commonTenant: Tenant = {
        id: 'common',
        displayName: 'common'
    };

    constructor(
        private _client: SqlToolsServiceClient,
        private _vscodeWrapper: VscodeWrapper,
        private _context: vscode.ExtensionContext,
        private _accountStore: AccountStore
    ) {}

    public get account(): IAccount {
        return this._account;
    }

    public setAccount(account: IAccount): void {
        this._account = account;
    }

    public get client(): SqlToolsServiceClient {
        return this._client;
    }

    /**
     * Public for testing purposes only
     */
    public set token(value: any) {
        this._token = value;
    }

    public convertToAzureAccount(azureSession: IAzureSession): IAccount {
        let tenant = {
            displayName: Constants.tenantDisplayName,
            id: azureSession.tenantId,
            userId: azureSession.userId
        };
        let key: IAccountKey = {
            providerId: Constants.resourceProviderId,
            id: azureSession.userId
        };
        let account: IAccount = {
            key: key,
            displayInfo: {
                userId: azureSession.userId,
                displayName: undefined,
                accountType: undefined,
                name: undefined
            },
            properties: {
                tenants: [tenant]
            },
            isStale: this._isStale,
            isSignedIn: false
        };
        return account;
    }

    public async createSecurityTokenMapping(): Promise<any> {
        let mapping = {};
        mapping[this.getHomeTenant(this.account).id] = {
            token: await this.refreshToken(this.account)
        };
        return mapping;
    }

    public async refreshToken(account): Promise<string> {
        let azureController = new AzureController(this._context);
        return await azureController.refreshToken(account, this._accountStore, providerSettings.resources.azureManagementResource);
    }

    public getHomeTenant(account: IAccount): Tenant {
        // Home is defined by the API
        // Lets pick the home tenant - and fall back to commonTenant if they don't exist
        return account.properties.tenants.find(t => t.tenantCategory === 'Home') ?? account.properties.tenants[0] ?? this.commonTenant;
    }


}
