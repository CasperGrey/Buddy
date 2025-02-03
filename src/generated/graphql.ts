import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type ChatError = {
  __typename?: 'ChatError';
  code: Scalars['String']['output'];
  conversationId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type Conversation = {
  __typename?: 'Conversation';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  messages: Array<Message>;
  model: Scalars['String']['output'];
};

export type Message = {
  __typename?: 'Message';
  content: Scalars['String']['output'];
  conversationId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type ModelCapability = {
  __typename?: 'ModelCapability';
  capabilities: Array<Scalars['String']['output']>;
  maxTokens: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  sendMessage: Message;
  startConversation: Conversation;
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationStartConversationArgs = {
  model: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  conversations: Array<Conversation>;
  messages: Array<Message>;
  modelCapabilities: Array<ModelCapability>;
};


export type QueryMessagesArgs = {
  conversationId: Scalars['ID']['input'];
};

export type SendMessageInput = {
  content: Scalars['String']['input'];
  conversationId: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  messageReceived?: Maybe<Message>;
  onError: ChatError;
};


export type SubscriptionMessageReceivedArgs = {
  conversationId: Scalars['String']['input'];
};

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { __typename?: 'Mutation', sendMessage: { __typename?: 'Message', id: string, content: string, role: string, timestamp: string, conversationId: string } };

export type StartConversationMutationVariables = Exact<{
  model: Scalars['String']['input'];
}>;


export type StartConversationMutation = { __typename?: 'Mutation', startConversation: { __typename?: 'Conversation', id: string, model: string, createdAt: string, messages: Array<{ __typename?: 'Message', id: string, content: string, role: string, timestamp: string }> } };

export type GetMessagesQueryVariables = Exact<{
  conversationId: Scalars['ID']['input'];
}>;


export type GetMessagesQuery = { __typename?: 'Query', messages: Array<{ __typename?: 'Message', id: string, content: string, role: string, timestamp: string, conversationId: string }> };

export type GetConversationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetConversationsQuery = { __typename?: 'Query', conversations: Array<{ __typename?: 'Conversation', id: string, model: string, createdAt: string, messages: Array<{ __typename?: 'Message', id: string, content: string, role: string, timestamp: string }> }> };

export type GetModelCapabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetModelCapabilitiesQuery = { __typename?: 'Query', modelCapabilities: Array<{ __typename?: 'ModelCapability', name: string, capabilities: Array<string>, maxTokens: number }> };

export type OnMessageReceivedSubscriptionVariables = Exact<{
  conversationId: Scalars['String']['input'];
}>;


export type OnMessageReceivedSubscription = { __typename?: 'Subscription', messageReceived?: { __typename?: 'Message', id: string, content: string, role: string, timestamp: string, conversationId: string } | null };

export type OnErrorSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnErrorSubscription = { __typename?: 'Subscription', onError: { __typename?: 'ChatError', message: string, code: string, conversationId?: string | null } };


export const SendMessageDocument = gql`
    mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    content
    role
    timestamp
    conversationId
  }
}
    `;
export type SendMessageMutationFn = Apollo.MutationFunction<SendMessageMutation, SendMessageMutationVariables>;

/**
 * __useSendMessageMutation__
 *
 * To run a mutation, you first call `useSendMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendMessageMutation, { data, loading, error }] = useSendMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendMessageMutation, SendMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendMessageMutation, SendMessageMutationVariables>(SendMessageDocument, options);
      }
export type SendMessageMutationHookResult = ReturnType<typeof useSendMessageMutation>;
export type SendMessageMutationResult = Apollo.MutationResult<SendMessageMutation>;
export type SendMessageMutationOptions = Apollo.BaseMutationOptions<SendMessageMutation, SendMessageMutationVariables>;
export const StartConversationDocument = gql`
    mutation StartConversation($model: String!) {
  startConversation(model: $model) {
    id
    model
    createdAt
    messages {
      id
      content
      role
      timestamp
    }
  }
}
    `;
export type StartConversationMutationFn = Apollo.MutationFunction<StartConversationMutation, StartConversationMutationVariables>;

/**
 * __useStartConversationMutation__
 *
 * To run a mutation, you first call `useStartConversationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartConversationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startConversationMutation, { data, loading, error }] = useStartConversationMutation({
 *   variables: {
 *      model: // value for 'model'
 *   },
 * });
 */
export function useStartConversationMutation(baseOptions?: Apollo.MutationHookOptions<StartConversationMutation, StartConversationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartConversationMutation, StartConversationMutationVariables>(StartConversationDocument, options);
      }
export type StartConversationMutationHookResult = ReturnType<typeof useStartConversationMutation>;
export type StartConversationMutationResult = Apollo.MutationResult<StartConversationMutation>;
export type StartConversationMutationOptions = Apollo.BaseMutationOptions<StartConversationMutation, StartConversationMutationVariables>;
export const GetMessagesDocument = gql`
    query GetMessages($conversationId: ID!) {
  messages(conversationId: $conversationId) {
    id
    content
    role
    timestamp
    conversationId
  }
}
    `;

/**
 * __useGetMessagesQuery__
 *
 * To run a query within a React component, call `useGetMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMessagesQuery({
 *   variables: {
 *      conversationId: // value for 'conversationId'
 *   },
 * });
 */
export function useGetMessagesQuery(baseOptions: Apollo.QueryHookOptions<GetMessagesQuery, GetMessagesQueryVariables> & ({ variables: GetMessagesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMessagesQuery, GetMessagesQueryVariables>(GetMessagesDocument, options);
      }
export function useGetMessagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMessagesQuery, GetMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMessagesQuery, GetMessagesQueryVariables>(GetMessagesDocument, options);
        }
export function useGetMessagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMessagesQuery, GetMessagesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMessagesQuery, GetMessagesQueryVariables>(GetMessagesDocument, options);
        }
export type GetMessagesQueryHookResult = ReturnType<typeof useGetMessagesQuery>;
export type GetMessagesLazyQueryHookResult = ReturnType<typeof useGetMessagesLazyQuery>;
export type GetMessagesSuspenseQueryHookResult = ReturnType<typeof useGetMessagesSuspenseQuery>;
export type GetMessagesQueryResult = Apollo.QueryResult<GetMessagesQuery, GetMessagesQueryVariables>;
export const GetConversationsDocument = gql`
    query GetConversations {
  conversations {
    id
    model
    createdAt
    messages {
      id
      content
      role
      timestamp
    }
  }
}
    `;

/**
 * __useGetConversationsQuery__
 *
 * To run a query within a React component, call `useGetConversationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetConversationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetConversationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetConversationsQuery(baseOptions?: Apollo.QueryHookOptions<GetConversationsQuery, GetConversationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetConversationsQuery, GetConversationsQueryVariables>(GetConversationsDocument, options);
      }
export function useGetConversationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetConversationsQuery, GetConversationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetConversationsQuery, GetConversationsQueryVariables>(GetConversationsDocument, options);
        }
export function useGetConversationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConversationsQuery, GetConversationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetConversationsQuery, GetConversationsQueryVariables>(GetConversationsDocument, options);
        }
export type GetConversationsQueryHookResult = ReturnType<typeof useGetConversationsQuery>;
export type GetConversationsLazyQueryHookResult = ReturnType<typeof useGetConversationsLazyQuery>;
export type GetConversationsSuspenseQueryHookResult = ReturnType<typeof useGetConversationsSuspenseQuery>;
export type GetConversationsQueryResult = Apollo.QueryResult<GetConversationsQuery, GetConversationsQueryVariables>;
export const GetModelCapabilitiesDocument = gql`
    query GetModelCapabilities {
  modelCapabilities {
    name
    capabilities
    maxTokens
  }
}
    `;

/**
 * __useGetModelCapabilitiesQuery__
 *
 * To run a query within a React component, call `useGetModelCapabilitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetModelCapabilitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetModelCapabilitiesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetModelCapabilitiesQuery(baseOptions?: Apollo.QueryHookOptions<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>(GetModelCapabilitiesDocument, options);
      }
export function useGetModelCapabilitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>(GetModelCapabilitiesDocument, options);
        }
export function useGetModelCapabilitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>(GetModelCapabilitiesDocument, options);
        }
export type GetModelCapabilitiesQueryHookResult = ReturnType<typeof useGetModelCapabilitiesQuery>;
export type GetModelCapabilitiesLazyQueryHookResult = ReturnType<typeof useGetModelCapabilitiesLazyQuery>;
export type GetModelCapabilitiesSuspenseQueryHookResult = ReturnType<typeof useGetModelCapabilitiesSuspenseQuery>;
export type GetModelCapabilitiesQueryResult = Apollo.QueryResult<GetModelCapabilitiesQuery, GetModelCapabilitiesQueryVariables>;
export const OnMessageReceivedDocument = gql`
    subscription OnMessageReceived($conversationId: String!) {
  messageReceived(conversationId: $conversationId) {
    id
    content
    role
    timestamp
    conversationId
  }
}
    `;

/**
 * __useOnMessageReceivedSubscription__
 *
 * To run a query within a React component, call `useOnMessageReceivedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnMessageReceivedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnMessageReceivedSubscription({
 *   variables: {
 *      conversationId: // value for 'conversationId'
 *   },
 * });
 */
export function useOnMessageReceivedSubscription(baseOptions: Apollo.SubscriptionHookOptions<OnMessageReceivedSubscription, OnMessageReceivedSubscriptionVariables> & ({ variables: OnMessageReceivedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnMessageReceivedSubscription, OnMessageReceivedSubscriptionVariables>(OnMessageReceivedDocument, options);
      }
export type OnMessageReceivedSubscriptionHookResult = ReturnType<typeof useOnMessageReceivedSubscription>;
export type OnMessageReceivedSubscriptionResult = Apollo.SubscriptionResult<OnMessageReceivedSubscription>;
export const OnErrorDocument = gql`
    subscription OnError {
  onError {
    message
    code
    conversationId
  }
}
    `;

/**
 * __useOnErrorSubscription__
 *
 * To run a query within a React component, call `useOnErrorSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnErrorSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnErrorSubscription({
 *   variables: {
 *   },
 * });
 */
export function useOnErrorSubscription(baseOptions?: Apollo.SubscriptionHookOptions<OnErrorSubscription, OnErrorSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnErrorSubscription, OnErrorSubscriptionVariables>(OnErrorDocument, options);
      }
export type OnErrorSubscriptionHookResult = ReturnType<typeof useOnErrorSubscription>;
export type OnErrorSubscriptionResult = Apollo.SubscriptionResult<OnErrorSubscription>;