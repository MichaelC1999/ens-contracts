pragma solidity >=0.8.4;

import "./ENS.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * A registrar that allocates subdomains to the first person to claim them.
 */
contract FIFSRegistrar is IERC721Receiver {
    ENS ens;
    bytes32 rootNode;

    modifier only_owner(bytes32 label) {
        address currentOwner = ens.owner(
            keccak256(abi.encodePacked(rootNode, label))
        );
        require(
            currentOwner == address(0x0) || currentOwner == msg.sender,
            "Only the owner may call this function"
        );
        _;
    }

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param node The node that this registrar administers.
     */
    constructor(ENS ensAddr, bytes32 node) public {
        ens = ensAddr;
        rootNode = node;
    }

    /**
     * Register a name, or change the owner of an existing registration.
     * @param label The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 label, address owner) public only_owner(label) {
        ens.setSubnodeOwner(rootNode, label, owner);
    }

    function onERC721Received(
        address to,
        address,
        uint256 tokenId,
        bytes calldata data
    ) public returns (bytes4) {
        // (
        //     string memory label,
        //     address owner,
        //     uint16 ownerControlledFuses,
        //     address resolver
        // ) = abi.decode(data, (string, address, uint16, address));

        // bytes32 labelhash = bytes32(tokenId);
        // bytes32 labelhashFromData = keccak256(bytes(label));

        // if (labelhashFromData != labelhash) {
        //     revert LabelMismatch(labelhashFromData, labelhash);
        // }

        // // transfer the ens record back to the new owner (this contract)
        // registrar.reclaim(uint256(labelhash), address(this));

        return IERC721Receiver(address(this)).onERC721Received.selector;
    }
}
