// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OrgRegistry
/// @notice Registers organisation wallets and tracks deploy authorization on MST Chain.
contract OrgRegistry is Ownable {
    struct Organisation {
        address wallet;
        string slug;
        bool active;
    }

    mapping(address wallet => Organisation) private _orgs;
    mapping(address wallet => bool) public authorizedDeployers;

    event OrgRegistered(address indexed wallet, string slug);
    event OrgDeactivated(address indexed wallet);
    event DeployerAuthorized(address indexed wallet);
    event DeployerRevoked(address indexed wallet);

    error OrgAlreadyRegistered();
    error OrgNotRegistered();
    error InvalidWallet();

    constructor() Ownable(msg.sender) {}

    function registerOrg(address wallet, string calldata slug) external onlyOwner {
        if (wallet == address(0)) revert InvalidWallet();
        if (_orgs[wallet].active) revert OrgAlreadyRegistered();
        _orgs[wallet] = Organisation({wallet: wallet, slug: slug, active: true});
        emit OrgRegistered(wallet, slug);
    }

    function deactivateOrg(address wallet) external onlyOwner {
        Organisation storage org = _orgs[wallet];
        if (!org.active) revert OrgNotRegistered();
        org.active = false;
        emit OrgDeactivated(wallet);
    }

    function authorizeDeployer(address wallet) external onlyOwner {
        if (wallet == address(0)) revert InvalidWallet();
        authorizedDeployers[wallet] = true;
        emit DeployerAuthorized(wallet);
    }

    function revokeDeployer(address wallet) external onlyOwner {
        authorizedDeployers[wallet] = false;
        emit DeployerRevoked(wallet);
    }

    function isRegistered(address wallet) external view returns (bool) {
        return _orgs[wallet].active;
    }

    function getOrg(address wallet) external view returns (Organisation memory) {
        return _orgs[wallet];
    }

    function canDeploy(address wallet) external view returns (bool) {
        return _orgs[wallet].active || authorizedDeployers[wallet];
    }
}
