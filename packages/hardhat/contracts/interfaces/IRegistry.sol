// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IRegistry {
    function register(
        address rig,
        string calldata rigType,
        address unit,
        address launcher
    ) external;

    function approvedFactories(address factory) external view returns (bool);
    function isRegistered(address rig) external view returns (bool);
}
