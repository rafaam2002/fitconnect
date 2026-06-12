import { Migration } from '@mikro-orm/migrations';

export class Migration20260611171109 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "notification" add column "title" varchar(255) not null, add column "read" boolean not null default false;`
    );
    this.addSql(
      `alter table "notification" alter column "type" type text using ("type"::text);`
    );
    this.addSql(
      `alter table "notification" alter column "link" type varchar(255) using ("link"::varchar(255));`
    );
    this.addSql(
      `alter table "notification" alter column "link" drop not null;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" drop default;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" type uuid using ("company_id"::text::uuid);`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" drop not null;`
    );
    this.addSql(
      `alter table "notification" add constraint "notification_type_check" check("type" in ('message', 'warning', 'error', 'info'));`
    );
    this.addSql(
      `alter table "notification" add constraint "notification_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "notification" add constraint "notification_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `create index "notification_user_id_index" on "notification" ("user_id");`
    );
    this.addSql(
      `create index "notification_company_id_index" on "notification" ("company_id");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`create schema if not exists "auth";`);
    this.addSql(`create schema if not exists "realtime";`);
    this.addSql(`create schema if not exists "storage";`);
    this.addSql(`create schema if not exists "vault";`);
    this.addSql(
      `create type "auth"."aal_level" as enum ('aal1', 'aal2', 'aal3');`
    );
    this.addSql(
      `create type "realtime"."action" as enum ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');`
    );
    this.addSql(
      `create type "storage"."buckettype" as enum ('STANDARD', 'ANALYTICS', 'VECTOR');`
    );
    this.addSql(
      `create type "auth"."code_challenge_method" as enum ('s256', 'plain');`
    );
    this.addSql(
      `create type "realtime"."equality_op" as enum ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in');`
    );
    this.addSql(
      `create type "auth"."factor_status" as enum ('unverified', 'verified');`
    );
    this.addSql(
      `create type "auth"."factor_type" as enum ('totp', 'webauthn', 'phone');`
    );
    this.addSql(
      `create type "auth"."oauth_authorization_status" as enum ('pending', 'approved', 'denied', 'expired');`
    );
    this.addSql(
      `create type "auth"."oauth_client_type" as enum ('public', 'confidential');`
    );
    this.addSql(
      `create type "auth"."oauth_registration_type" as enum ('dynamic', 'manual');`
    );
    this.addSql(`create type "auth"."oauth_response_type" as enum ('code');`);
    this.addSql(
      `create type "auth"."one_time_token_type" as enum ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');`
    );
    this.addSql(
      `create table "auth"."audit_log_entries" ("instance_id" uuid null, "id" uuid not null, "payload" json null, "created_at" timestamptz(6) null, "ip_address" varchar(64) not null default '', constraint "audit_log_entries_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."audit_log_entries" is 'Auth: Audit trail for user actions.';`
    );
    this.addSql(
      `create index "audit_logs_instance_id_idx" on "auth"."audit_log_entries" ("instance_id");`
    );

    this.addSql(
      `create table "storage"."buckets" ("id" text not null, "name" text not null, "owner" uuid null, "created_at" timestamptz(6) null default now(), "updated_at" timestamptz(6) null default now(), "public" bool null default false, "avif_autodetection" bool null default false, "file_size_limit" int8 null, "allowed_mime_types" text[] null, "owner_id" text null, "type" "storage"."buckettype" not null default 'STANDARD', constraint "buckets_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on column "storage"."buckets"."owner" is 'Field is deprecated, use owner_id instead';`
    );
    this.addSql(
      `alter table "storage"."buckets" add constraint "bname" unique ("name");`
    );

    this.addSql(
      `create table "storage"."buckets_analytics" ("name" text not null, "type" "storage"."buckettype" not null default 'ANALYTICS', "format" text not null default 'ICEBERG', "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "id" uuid not null default gen_random_uuid(), "deleted_at" timestamptz(6) null, constraint "buckets_analytics_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);`
    );

    this.addSql(
      `create table "storage"."buckets_vectors" ("id" text not null, "type" "storage"."buckettype" not null default 'VECTOR', "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), constraint "buckets_vectors_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "card" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "stripe_payment_method_id" varchar(255) not null, "user_id" uuid not null, "card_brand" varchar(255) not null, "card_last4" varchar(255) not null, "card_exp_month" int4 not null, "card_exp_year" int4 not null, "status" text check ("status" in ('active', 'inactive', 'expired')) not null default 'active', "is_default" bool not null default false, constraint "card_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "auth"."custom_oauth_providers" ("id" uuid not null default gen_random_uuid(), "provider_type" text not null, "identifier" text not null, "name" text not null, "client_id" text not null, "client_secret" text not null, "acceptable_client_ids" text[] not null default '{}', "scopes" text[] not null default '{}', "pkce_enabled" bool not null default true, "attribute_mapping" jsonb not null default '{}', "authorization_params" jsonb not null default '{}', "enabled" bool not null default true, "email_optional" bool not null default false, "issuer" text null, "discovery_url" text null, "skip_nonce_check" bool not null default false, "cached_discovery" jsonb null, "discovery_cached_at" timestamptz(6) null, "authorization_url" text null, "token_url" text null, "userinfo_url" text null, "jwks_uri" text null, "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), constraint "custom_oauth_providers_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "custom_oauth_providers_created_at_idx" on "auth"."custom_oauth_providers" ("created_at");`
    );
    this.addSql(
      `create index "custom_oauth_providers_enabled_idx" on "auth"."custom_oauth_providers" ("enabled");`
    );
    this.addSql(
      `create index "custom_oauth_providers_identifier_idx" on "auth"."custom_oauth_providers" ("identifier");`
    );
    this.addSql(
      `alter table "auth"."custom_oauth_providers" add constraint "custom_oauth_providers_identifier_key" unique ("identifier");`
    );
    this.addSql(
      `create index "custom_oauth_providers_provider_type_idx" on "auth"."custom_oauth_providers" ("provider_type");`
    );

    this.addSql(
      `create table "auth"."flow_state" ("id" uuid not null, "user_id" uuid null, "auth_code" text null, "code_challenge_method" "auth"."code_challenge_method" null, "code_challenge" text null, "provider_type" text not null, "provider_access_token" text null, "provider_refresh_token" text null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "authentication_method" text not null, "auth_code_issued_at" timestamptz(6) null, "invite_token" text null, "referrer" text null, "oauth_client_state_id" uuid null, "linking_target_id" uuid null, "email_optional" bool not null default false, constraint "flow_state_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."flow_state" is 'Stores metadata for all OAuth/SSO login flows';`
    );
    this.addSql(
      `create index "flow_state_created_at_idx" on "auth"."flow_state" ("created_at");`
    );
    this.addSql(
      `create index "idx_auth_code" on "auth"."flow_state" ("auth_code");`
    );
    this.addSql(
      `create index "idx_user_id_auth_method" on "auth"."flow_state" ("user_id", "authentication_method");`
    );

    this.addSql(
      `create table "auth"."identities" ("provider_id" text not null, "user_id" uuid not null, "identity_data" jsonb not null, "provider" text not null, "last_sign_in_at" timestamptz(6) null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "email" text generated always as lower((identity_data ->> 'email'::text)) stored null, "id" uuid not null default gen_random_uuid(), constraint "identities_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."identities" is 'Auth: Stores identities associated to a user.';`
    );
    this.addSql(
      `comment on column "auth"."identities"."email" is 'Auth: Email is a generated column that references the optional email property in the identity_data';`
    );
    this.addSql(
      `create index "identities_email_idx" on "auth"."identities" ("email");`
    );
    this.addSql(
      `alter table "auth"."identities" add constraint "identities_provider_id_provider_unique" unique ("provider_id", "provider");`
    );
    this.addSql(
      `create index "identities_user_id_idx" on "auth"."identities" ("user_id");`
    );

    this.addSql(
      `create table "auth"."instances" ("id" uuid not null, "uuid" uuid null, "raw_base_config" text null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, constraint "instances_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."instances" is 'Auth: Manages users across multiple sites.';`
    );

    this.addSql(
      `create table "member_ship" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "user_id" uuid not null, "company_id" uuid not null, "role" text check ("role" in ('standard', 'boss', 'premium', 'coach')) not null, constraint "member_ship_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "member_ship_created_at_index" on "member_ship" ("created_at");`
    );
    this.addSql(
      `alter table "member_ship" add constraint "member_ship_user_id_company_id_unique" unique ("user_id", "company_id");`
    );

    this.addSql(
      `create table "realtime"."messages" ("topic" text not null, "extension" text not null, "payload" jsonb null, "event" text null, "private" bool null default false, "updated_at" timestamp(6) not null default now(), "inserted_at" timestamp(6) not null default now(), "id" uuid not null default gen_random_uuid(), constraint "messages_pkey" primary key ("id", "inserted_at"));`
    );
    this.addSql(
      `CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));`
    );

    this.addSql(
      `create table "auth"."mfa_amr_claims" ("session_id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "authentication_method" text not null, "id" uuid not null, constraint "amr_id_pk" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."mfa_amr_claims" is 'auth: stores authenticator method reference claims for multi factor authentication';`
    );
    this.addSql(
      `alter table "auth"."mfa_amr_claims" add constraint "mfa_amr_claims_session_id_authentication_method_pkey" unique ("session_id", "authentication_method");`
    );

    this.addSql(
      `create table "auth"."mfa_challenges" ("id" uuid not null, "factor_id" uuid not null, "created_at" timestamptz(6) not null, "verified_at" timestamptz(6) null, "ip_address" inet not null, "otp_code" text null, "web_authn_session_data" jsonb null, constraint "mfa_challenges_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."mfa_challenges" is 'auth: stores metadata about challenge requests made';`
    );
    this.addSql(
      `create index "mfa_challenge_created_at_idx" on "auth"."mfa_challenges" ("created_at");`
    );

    this.addSql(
      `create table "auth"."mfa_factors" ("id" uuid not null, "user_id" uuid not null, "friendly_name" text null, "factor_type" "auth"."factor_type" not null, "status" "auth"."factor_status" not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "secret" text null, "phone" text null, "last_challenged_at" timestamptz(6) null, "web_authn_credential" jsonb null, "web_authn_aaguid" uuid null, "last_webauthn_challenge_data" jsonb null, constraint "mfa_factors_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."mfa_factors" is 'auth: stores metadata about factors';`
    );
    this.addSql(
      `comment on column "auth"."mfa_factors"."last_webauthn_challenge_data" is 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';`
    );
    this.addSql(
      `create index "factor_id_created_at_idx" on "auth"."mfa_factors" ("user_id", "created_at");`
    );
    this.addSql(
      `alter table "auth"."mfa_factors" add constraint "mfa_factors_last_challenged_at_key" unique ("last_challenged_at");`
    );
    this.addSql(
      `CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);`
    );
    this.addSql(
      `create index "mfa_factors_user_id_idx" on "auth"."mfa_factors" ("user_id");`
    );
    this.addSql(
      `alter table "auth"."mfa_factors" add constraint "unique_phone_factor_per_user" unique ("user_id", "phone");`
    );

    this.addSql(
      `create table "storage"."migrations" ("id" int4 not null, "name" varchar(100) not null, "hash" varchar(40) not null, "executed_at" timestamp(6) null default CURRENT_TIMESTAMP, constraint "migrations_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "storage"."migrations" add constraint "migrations_name_key" unique ("name");`
    );

    this.addSql(
      `create table "auth"."oauth_authorizations" ("id" uuid not null, "authorization_id" text not null, "client_id" uuid not null, "user_id" uuid null, "redirect_uri" text not null, "scope" text not null, "state" text null, "resource" text null, "code_challenge" text null, "code_challenge_method" "auth"."code_challenge_method" null, "response_type" "auth"."oauth_response_type" not null default 'code', "status" "auth"."oauth_authorization_status" not null default 'pending', "authorization_code" text null, "created_at" timestamptz(6) not null default now(), "expires_at" timestamptz(6) not null default (now() + '00:03:00'::interval), "approved_at" timestamptz(6) null, "nonce" text null, constraint "oauth_authorizations_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);`
    );
    this.addSql(
      `alter table "auth"."oauth_authorizations" add constraint "oauth_authorizations_authorization_code_key" unique ("authorization_code");`
    );
    this.addSql(
      `alter table "auth"."oauth_authorizations" add constraint "oauth_authorizations_authorization_id_key" unique ("authorization_id");`
    );

    this.addSql(
      `create table "auth"."oauth_client_states" ("id" uuid not null, "provider_type" text not null, "code_verifier" text null, "created_at" timestamptz(6) not null, constraint "oauth_client_states_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."oauth_client_states" is 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';`
    );
    this.addSql(
      `create index "idx_oauth_client_states_created_at" on "auth"."oauth_client_states" ("created_at");`
    );

    this.addSql(
      `create table "auth"."oauth_clients" ("id" uuid not null, "client_secret_hash" text null, "registration_type" "auth"."oauth_registration_type" not null, "redirect_uris" text not null, "grant_types" text not null, "client_name" text null, "client_uri" text null, "logo_uri" text null, "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "deleted_at" timestamptz(6) null, "client_type" "auth"."oauth_client_type" not null default 'confidential', "token_endpoint_auth_method" text not null, constraint "oauth_clients_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "oauth_clients_deleted_at_idx" on "auth"."oauth_clients" ("deleted_at");`
    );

    this.addSql(
      `create table "auth"."oauth_consents" ("id" uuid not null, "user_id" uuid not null, "client_id" uuid not null, "scopes" text not null, "granted_at" timestamptz(6) not null default now(), "revoked_at" timestamptz(6) null, constraint "oauth_consents_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);`
    );
    this.addSql(
      `CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);`
    );
    this.addSql(
      `alter table "auth"."oauth_consents" add constraint "oauth_consents_user_client_unique" unique ("user_id", "client_id");`
    );
    this.addSql(
      `create index "oauth_consents_user_order_idx" on "auth"."oauth_consents" ("user_id", "granted_at");`
    );

    this.addSql(
      `create table "storage"."objects" ("id" uuid not null default gen_random_uuid(), "bucket_id" text null, "name" text null, "owner" uuid null, "created_at" timestamptz(6) null default now(), "updated_at" timestamptz(6) null default now(), "last_accessed_at" timestamptz(6) null default now(), "metadata" jsonb null, "path_tokens" text[] generated always as string_to_array(name, '/'::text) stored null, "version" text null, "owner_id" text null, "user_metadata" jsonb null, constraint "objects_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on column "storage"."objects"."owner" is 'Field is deprecated, use owner_id instead';`
    );
    this.addSql(
      `alter table "storage"."objects" add constraint "bucketid_objname" unique ("bucket_id", "name");`
    );
    this.addSql(
      `create index "idx_objects_bucket_id_name" on "storage"."objects" ("bucket_id", "name");`
    );
    this.addSql(
      `CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");`
    );
    this.addSql(
      `create index "name_prefix_search" on "storage"."objects" ("name");`
    );

    this.addSql(
      `create table "auth"."one_time_tokens" ("id" uuid not null, "user_id" uuid not null, "token_type" "auth"."one_time_token_type" not null, "token_hash" text not null, "relates_to" text not null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "one_time_tokens_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "one_time_tokens_relates_to_hash_idx" on "auth"."one_time_tokens" ("relates_to");`
    );
    this.addSql(
      `create index "one_time_tokens_token_hash_hash_idx" on "auth"."one_time_tokens" ("token_hash");`
    );
    this.addSql(
      `alter table "auth"."one_time_tokens" add constraint "one_time_tokens_user_id_token_type_key" unique ("user_id", "token_type");`
    );

    this.addSql(
      `create table "auth"."refresh_tokens" ("instance_id" uuid null, "id" bigserial primary key, "token" varchar(255) null, "user_id" varchar(255) null, "revoked" bool null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "parent" varchar(255) null, "session_id" uuid null);`
    );
    this.addSql(
      `comment on table "auth"."refresh_tokens" is 'Auth: Store of tokens used to refresh JWT tokens once they expire.';`
    );
    this.addSql(
      `create index "refresh_tokens_instance_id_idx" on "auth"."refresh_tokens" ("instance_id");`
    );
    this.addSql(
      `create index "refresh_tokens_instance_id_user_id_idx" on "auth"."refresh_tokens" ("instance_id", "user_id");`
    );
    this.addSql(
      `create index "refresh_tokens_parent_idx" on "auth"."refresh_tokens" ("parent");`
    );
    this.addSql(
      `create index "refresh_tokens_session_id_revoked_idx" on "auth"."refresh_tokens" ("session_id", "revoked");`
    );
    this.addSql(
      `alter table "auth"."refresh_tokens" add constraint "refresh_tokens_token_unique" unique ("token");`
    );
    this.addSql(
      `create index "refresh_tokens_updated_at_idx" on "auth"."refresh_tokens" ("updated_at");`
    );

    this.addSql(
      `create table "storage"."s3_multipart_uploads" ("id" text not null, "in_progress_size" int8 not null default 0, "upload_signature" text not null, "bucket_id" text not null, "key" text not null, "version" text not null, "owner_id" text null, "created_at" timestamptz(6) not null default now(), "user_metadata" jsonb null, "metadata" jsonb null, constraint "s3_multipart_uploads_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "idx_multipart_uploads_list" on "storage"."s3_multipart_uploads" ("bucket_id", "key", "created_at");`
    );

    this.addSql(
      `create table "storage"."s3_multipart_uploads_parts" ("id" uuid not null default gen_random_uuid(), "upload_id" text not null, "size" int8 not null default 0, "part_number" int4 not null, "bucket_id" text not null, "key" text not null, "etag" text not null, "owner_id" text null, "version" text not null, "created_at" timestamptz(6) not null default now(), constraint "s3_multipart_uploads_parts_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "auth"."saml_providers" ("id" uuid not null, "sso_provider_id" uuid not null, "entity_id" text not null, "metadata_xml" text not null, "metadata_url" text null, "attribute_mapping" jsonb null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "name_id_format" text null, constraint "saml_providers_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."saml_providers" is 'Auth: Manages SAML Identity Provider connections.';`
    );
    this.addSql(
      `alter table "auth"."saml_providers" add constraint "saml_providers_entity_id_key" unique ("entity_id");`
    );
    this.addSql(
      `create index "saml_providers_sso_provider_id_idx" on "auth"."saml_providers" ("sso_provider_id");`
    );

    this.addSql(
      `create table "auth"."saml_relay_states" ("id" uuid not null, "sso_provider_id" uuid not null, "request_id" text not null, "for_email" text null, "redirect_to" text null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "flow_state_id" uuid null, constraint "saml_relay_states_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."saml_relay_states" is 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';`
    );
    this.addSql(
      `create index "saml_relay_states_created_at_idx" on "auth"."saml_relay_states" ("created_at");`
    );
    this.addSql(
      `create index "saml_relay_states_for_email_idx" on "auth"."saml_relay_states" ("for_email");`
    );
    this.addSql(
      `create index "saml_relay_states_sso_provider_id_idx" on "auth"."saml_relay_states" ("sso_provider_id");`
    );

    this.addSql(
      `create table "realtime"."schema_migrations" ("version" int8 not null, "inserted_at" timestamp(0) null, constraint "schema_migrations_pkey" primary key ("version"));`
    );

    this.addSql(
      `create table "auth"."schema_migrations" ("version" varchar(255) not null, constraint "schema_migrations_pkey" primary key ("version"));`
    );
    this.addSql(
      `comment on table "auth"."schema_migrations" is 'Auth: Manages updates to the auth system.';`
    );

    this.addSql(
      `create table "vault"."secrets" ("id" uuid not null default gen_random_uuid(), "name" text null, "description" text not null default '', "secret" text not null, "key_id" uuid null, "nonce" bytea null default vault._crypto_aead_det_noncegen(), "created_at" timestamptz(6) not null default CURRENT_TIMESTAMP, "updated_at" timestamptz(6) not null default CURRENT_TIMESTAMP, constraint "secrets_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "vault"."secrets" is 'Table with encrypted \`secret\` column for storing sensitive information on disk.';`
    );
    this.addSql(
      `CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);`
    );

    this.addSql(
      `create table "auth"."sessions" ("id" uuid not null, "user_id" uuid not null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "factor_id" uuid null, "aal" "auth"."aal_level" null, "not_after" timestamptz(6) null, "refreshed_at" timestamp(6) null, "user_agent" text null, "ip" inet null, "tag" text null, "oauth_client_id" uuid null, "refresh_token_hmac_key" text null, "refresh_token_counter" int8 null, "scopes" text null, constraint "sessions_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."sessions" is 'Auth: Stores session data associated to a user.';`
    );
    this.addSql(
      `comment on column "auth"."sessions"."not_after" is 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';`
    );
    this.addSql(
      `comment on column "auth"."sessions"."refresh_token_hmac_key" is 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';`
    );
    this.addSql(
      `comment on column "auth"."sessions"."refresh_token_counter" is 'Holds the ID (counter) of the last issued refresh token.';`
    );
    this.addSql(
      `create index "sessions_not_after_idx" on "auth"."sessions" ("not_after");`
    );
    this.addSql(
      `create index "sessions_oauth_client_id_idx" on "auth"."sessions" ("oauth_client_id");`
    );
    this.addSql(
      `create index "sessions_user_id_idx" on "auth"."sessions" ("user_id");`
    );
    this.addSql(
      `create index "user_id_created_at_idx" on "auth"."sessions" ("user_id", "created_at");`
    );

    this.addSql(
      `create table "auth"."sso_domains" ("id" uuid not null, "sso_provider_id" uuid not null, "domain" text not null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, constraint "sso_domains_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."sso_domains" is 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';`
    );
    this.addSql(
      `CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));`
    );
    this.addSql(
      `create index "sso_domains_sso_provider_id_idx" on "auth"."sso_domains" ("sso_provider_id");`
    );

    this.addSql(
      `create table "auth"."sso_providers" ("id" uuid not null, "resource_id" text null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "disabled" bool null, constraint "sso_providers_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."sso_providers" is 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';`
    );
    this.addSql(
      `comment on column "auth"."sso_providers"."resource_id" is 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';`
    );
    this.addSql(
      `CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));`
    );
    this.addSql(
      `create index "sso_providers_resource_id_pattern_idx" on "auth"."sso_providers" ("resource_id");`
    );

    this.addSql(
      `create table "realtime"."subscription" ("id" int8 generated always as identity not null, "subscription_id" uuid not null, "entity" regclass not null, "filters" user_defined_filter[] not null default '{}', "claims" jsonb not null, "claims_role" regrole generated always as realtime.to_regrole((claims ->> 'role'::text)) stored not null, "created_at" timestamp(6) not null default timezone('utc'::text, now()), "action_filter" text null default '*', constraint "pk_subscription" primary key ("id"));`
    );
    this.addSql(
      `create index "ix_realtime_subscription_entity" on "realtime"."subscription" ("entity");`
    );
    this.addSql(
      `alter table "realtime"."subscription" add constraint "subscription_subscription_id_entity_filters_action_filter_key" unique ("subscription_id", "entity", "filters", "action_filter");`
    );

    this.addSql(
      `create table "auth"."users" ("instance_id" uuid null, "id" uuid not null, "aud" varchar(255) null, "role" varchar(255) null, "email" varchar(255) null, "encrypted_password" varchar(255) null, "email_confirmed_at" timestamptz(6) null, "invited_at" timestamptz(6) null, "confirmation_token" varchar(255) null, "confirmation_sent_at" timestamptz(6) null, "recovery_token" varchar(255) null, "recovery_sent_at" timestamptz(6) null, "email_change_token_new" varchar(255) null, "email_change" varchar(255) null, "email_change_sent_at" timestamptz(6) null, "last_sign_in_at" timestamptz(6) null, "raw_app_meta_data" jsonb null, "raw_user_meta_data" jsonb null, "is_super_admin" bool null, "created_at" timestamptz(6) null, "updated_at" timestamptz(6) null, "phone" text null, "phone_confirmed_at" timestamptz(6) null, "phone_change" text null default '', "phone_change_token" varchar(255) null default '', "phone_change_sent_at" timestamptz(6) null, "confirmed_at" timestamptz(6) generated always as LEAST(email_confirmed_at, phone_confirmed_at) stored null, "email_change_token_current" varchar(255) null default '', "email_change_confirm_status" int2 null default 0, "banned_until" timestamptz(6) null, "reauthentication_token" varchar(255) null default '', "reauthentication_sent_at" timestamptz(6) null, "is_sso_user" bool not null default false, "deleted_at" timestamptz(6) null, "is_anonymous" bool not null default false, constraint "users_pkey" primary key ("id"));`
    );
    this.addSql(
      `comment on table "auth"."users" is 'Auth: Stores user login data within a secure schema.';`
    );
    this.addSql(
      `comment on column "auth"."users"."is_sso_user" is 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';`
    );
    this.addSql(
      `CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*\$'::text);`
    );
    this.addSql(
      `CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*\$'::text);`
    );
    this.addSql(
      `CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*\$'::text);`
    );
    this.addSql(
      `CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*\$'::text);`
    );
    this.addSql(
      `CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*\$'::text);`
    );
    this.addSql(
      `CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);`
    );
    this.addSql(
      `CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));`
    );
    this.addSql(
      `create index "users_instance_id_idx" on "auth"."users" ("instance_id");`
    );
    this.addSql(
      `create index "users_is_anonymous_idx" on "auth"."users" ("is_anonymous");`
    );
    this.addSql(
      `alter table "auth"."users" add constraint "users_phone_key" unique ("phone");`
    );

    this.addSql(
      `create table "storage"."vector_indexes" ("id" text not null default gen_random_uuid(), "name" text not null, "bucket_id" text not null, "data_type" text not null, "dimension" int4 not null, "distance_metric" text not null, "metadata_configuration" jsonb null, "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), constraint "vector_indexes_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "storage"."vector_indexes" add constraint "vector_indexes_name_bucket_id_idx" unique ("name", "bucket_id");`
    );

    this.addSql(
      `create table "auth"."webauthn_challenges" ("id" uuid not null default gen_random_uuid(), "user_id" uuid null, "challenge_type" text not null, "session_data" jsonb not null, "created_at" timestamptz(6) not null default now(), "expires_at" timestamptz(6) not null, constraint "webauthn_challenges_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "webauthn_challenges_expires_at_idx" on "auth"."webauthn_challenges" ("expires_at");`
    );
    this.addSql(
      `create index "webauthn_challenges_user_id_idx" on "auth"."webauthn_challenges" ("user_id");`
    );

    this.addSql(
      `create table "auth"."webauthn_credentials" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "credential_id" bytea not null, "public_key" bytea not null, "attestation_type" text not null default '', "aaguid" uuid null, "sign_count" int8 not null default 0, "transports" jsonb not null default '[]', "backup_eligible" bool not null default false, "backed_up" bool not null default false, "friendly_name" text not null default '', "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "last_used_at" timestamptz(6) null, constraint "webauthn_credentials_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "auth"."webauthn_credentials" add constraint "webauthn_credentials_credential_id_key" unique ("credential_id");`
    );
    this.addSql(
      `create index "webauthn_credentials_user_id_idx" on "auth"."webauthn_credentials" ("user_id");`
    );

    this.addSql(
      `alter table "auth"."identities" add constraint "identities_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."mfa_amr_claims" add constraint "mfa_amr_claims_session_id_fkey" foreign key ("session_id") references "auth"."sessions" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."mfa_challenges" add constraint "mfa_challenges_auth_factor_id_fkey" foreign key ("factor_id") references "auth"."mfa_factors" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."mfa_factors" add constraint "mfa_factors_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."oauth_authorizations" add constraint "oauth_authorizations_client_id_fkey" foreign key ("client_id") references "auth"."oauth_clients" ("id") on update no action on delete cascade;`
    );
    this.addSql(
      `alter table "auth"."oauth_authorizations" add constraint "oauth_authorizations_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."oauth_consents" add constraint "oauth_consents_client_id_fkey" foreign key ("client_id") references "auth"."oauth_clients" ("id") on update no action on delete cascade;`
    );
    this.addSql(
      `alter table "auth"."oauth_consents" add constraint "oauth_consents_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "storage"."objects" add constraint "objects_bucketId_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id") on update no action on delete no action;`
    );

    this.addSql(
      `alter table "auth"."one_time_tokens" add constraint "one_time_tokens_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."refresh_tokens" add constraint "refresh_tokens_session_id_fkey" foreign key ("session_id") references "auth"."sessions" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "storage"."s3_multipart_uploads" add constraint "s3_multipart_uploads_bucket_id_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id") on update no action on delete no action;`
    );

    this.addSql(
      `alter table "storage"."s3_multipart_uploads_parts" add constraint "s3_multipart_uploads_parts_bucket_id_fkey" foreign key ("bucket_id") references "storage"."buckets" ("id") on update no action on delete no action;`
    );
    this.addSql(
      `alter table "storage"."s3_multipart_uploads_parts" add constraint "s3_multipart_uploads_parts_upload_id_fkey" foreign key ("upload_id") references "storage"."s3_multipart_uploads" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."saml_providers" add constraint "saml_providers_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."saml_relay_states" add constraint "saml_relay_states_flow_state_id_fkey" foreign key ("flow_state_id") references "auth"."flow_state" ("id") on update no action on delete cascade;`
    );
    this.addSql(
      `alter table "auth"."saml_relay_states" add constraint "saml_relay_states_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."sessions" add constraint "sessions_oauth_client_id_fkey" foreign key ("oauth_client_id") references "auth"."oauth_clients" ("id") on update no action on delete cascade;`
    );
    this.addSql(
      `alter table "auth"."sessions" add constraint "sessions_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."sso_domains" add constraint "sso_domains_sso_provider_id_fkey" foreign key ("sso_provider_id") references "auth"."sso_providers" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "storage"."vector_indexes" add constraint "vector_indexes_bucket_id_fkey" foreign key ("bucket_id") references "storage"."buckets_vectors" ("id") on update no action on delete no action;`
    );

    this.addSql(
      `alter table "auth"."webauthn_challenges" add constraint "webauthn_challenges_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "auth"."webauthn_credentials" add constraint "webauthn_credentials_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update no action on delete cascade;`
    );

    this.addSql(
      `alter table "notification" drop constraint if exists "notification_type_check";`
    );

    this.addSql(
      `alter table "notification" drop constraint "notification_user_id_foreign";`
    );
    this.addSql(
      `alter table "notification" drop constraint "notification_company_id_foreign";`
    );

    this.addSql(`drop index "notification_user_id_index";`);
    this.addSql(`drop index "notification_company_id_index";`);

    this.addSql(
      `alter table "notification" alter column "type" type varchar(255) using ("type"::varchar(255));`
    );
    this.addSql(
      `alter table "notification" alter column "link" type varchar(255) using ("link"::varchar(255));`
    );
    this.addSql(`alter table "notification" alter column "link" set not null;`);
    this.addSql(
      `alter table "notification" alter column "company_id" drop default;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" type uuid using ("company_id"::text::uuid);`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" set not null;`
    );
  }
}
