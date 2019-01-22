const Promise = require('promise');
const Web3 = require('web3');
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    'https://rinkeby.infura.io/v3/1ee94f399b964bd5bff8c194b2e4fb4f'));

const starNotaryContract = new web3.eth.Contract(
  [
    {
      'constant': false,
      'inputs': [
        {
          'name': 'to',
          'type': 'address'
        },
        {
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'approve',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'buyStar',
      'outputs': [],
      'payable': true,
      'stateMutability': 'payable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_name',
          'type': 'string'
        },
        {
          'name': '_story',
          'type': 'string'
        },
        {
          'name': '_ra',
          'type': 'string'
        },
        {
          'name': '_dec',
          'type': 'string'
        },
        {
          'name': '_mag',
          'type': 'string'
        },
        {
          'name': '_cen',
          'type': 'string'
        },
        {
          'name': '_tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'createStar',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'mint',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_tokenId',
          'type': 'uint256'
        },
        {
          'name': '_price',
          'type': 'uint256'
        }
      ],
      'name': 'putStarUpForSale',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': 'from',
          'type': 'address'
        },
        {
          'name': 'to',
          'type': 'address'
        },
        {
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'safeTransferFrom',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': 'from',
          'type': 'address'
        },
        {
          'name': 'to',
          'type': 'address'
        },
        {
          'name': 'tokenId',
          'type': 'uint256'
        },
        {
          'name': '_data',
          'type': 'bytes'
        }
      ],
      'name': 'safeTransferFrom',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': 'to',
          'type': 'address'
        },
        {
          'name': 'approved',
          'type': 'bool'
        }
      ],
      'name': 'setApprovalForAll',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': 'from',
          'type': 'address'
        },
        {
          'name': 'to',
          'type': 'address'
        },
        {
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'transferFrom',
      'outputs': [],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'anonymous': false,
      'inputs': [
        {
          'indexed': true,
          'name': 'from',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'to',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'Transfer',
      'type': 'event'
    },
    {
      'anonymous': false,
      'inputs': [
        {
          'indexed': true,
          'name': 'owner',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'approved',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'Approval',
      'type': 'event'
    },
    {
      'anonymous': false,
      'inputs': [
        {
          'indexed': true,
          'name': 'owner',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'operator',
          'type': 'address'
        },
        {
          'indexed': false,
          'name': 'approved',
          'type': 'bool'
        }
      ],
      'name': 'ApprovalForAll',
      'type': 'event'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': 'owner',
          'type': 'address'
        }
      ],
      'name': 'balanceOf',
      'outputs': [
        {
          'name': '',
          'type': 'uint256'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': '_ra',
          'type': 'string'
        },
        {
          'name': '_dec',
          'type': 'string'
        },
        {
          'name': '_mag',
          'type': 'string'
        },
        {
          'name': '_cen',
          'type': 'string'
        }
      ],
      'name': 'checkIfStarExist',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'getApproved',
      'outputs': [
        {
          'name': '',
          'type': 'address'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': 'owner',
          'type': 'address'
        },
        {
          'name': 'operator',
          'type': 'address'
        }
      ],
      'name': 'isApprovedForAll',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': 'tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'ownerOf',
      'outputs': [
        {
          'name': '',
          'type': 'address'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': '',
          'type': 'uint256'
        }
      ],
      'name': 'starsForSale',
      'outputs': [
        {
          'name': '',
          'type': 'uint256'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': 'interfaceId',
          'type': 'bytes4'
        }
      ],
      'name': 'supportsInterface',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': '_tokenId',
          'type': 'uint256'
        }
      ],
      'name': 'tokenIdToStarInfo',
      'outputs': [
        {
          'name': '_name',
          'type': 'string'
        },
        {
          'name': '_story',
          'type': 'string'
        },
        {
          'name': '_ra',
          'type': 'string'
        },
        {
          'name': '_dec',
          'type': 'string'
        },
        {
          'name': '_mag',
          'type': 'string'
        },
        {
          'name': '_cen',
          'type': 'string'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    }
  ], '0xb4c8974eb3e25ec69003a4466877eddba660b2b3');

/**
 * Wrapper class around the StarNotaryContract.
 *
 * @class StarNotary
 */
class StarNotary {
  /**
   * Returns star info for the given tokenId.
   *
   * @param {number} tokenId TokenId of the given star.
   * @returns {Array.string} Star info for the given tokenId.
   * @memberof StarNotary
   */
  async tokenIdToStarInfo(tokenId) {
    return new Promise((fulfill, reject) => {
      starNotaryContract.methods['tokenIdToStarInfo(uint256)'](tokenId).call(
        {}, function (error, result) {
          if (!error) {
            fulfill([
              result['_name'],
              result['_story'],
              result['_ra'],
              result['_dec'],
              result['_mag'],
              result['_cen']]);
          } else {
            reject(new Error(error));
          }
        });
    });
  }
}

module.exports = {
  StarNotary: StarNotary,
};
