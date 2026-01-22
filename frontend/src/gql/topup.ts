export const REDEEM_CODE_MUTATION = `
  mutation RedeemCode($code: String!) {
    redeemCode(code: $code) {
      success
      message
      newBalance
    }
  }
`;

export const GET_TOPUP_HISTORY_QUERY = `
  query GetTopupHistory($first: Int, $after: String, $before: String, $last: Int) {
    topupHistory(first: $first, after: $after, before: $before, last: $last) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          amount
          type
          status
          created_time
        }
      }
    }
  }
`;
