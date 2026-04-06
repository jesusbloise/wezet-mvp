--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_user_id uuid,
    org_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    specialty text,
    company text,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contacts_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'talents'::text, 'quotes'::text]))),
    CONSTRAINT contacts_type_check CHECK ((type = ANY (ARRAY['creativo'::text, 'empresa'::text])))
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: creative_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creative_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    bio text,
    location text,
    skills text[],
    rate_type text,
    rate_amount numeric(12,2),
    currency text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT creative_profiles_rate_type_check CHECK ((rate_type = ANY (ARRAY['hour'::text, 'day'::text, 'project'::text])))
);


ALTER TABLE public.creative_profiles OWNER TO postgres;

--
-- Name: negotiation_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.negotiation_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    negotiation_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    body text
);


ALTER TABLE public.negotiation_messages OWNER TO postgres;

--
-- Name: negotiation_offers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.negotiation_offers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    negotiation_id uuid NOT NULL,
    created_by uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL,
    deliverables text,
    notes text,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    CONSTRAINT negotiation_offers_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text])))
);


ALTER TABLE public.negotiation_offers OWNER TO postgres;

--
-- Name: negotiations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.negotiations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    producer_org_id uuid,
    creative_user_id uuid NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT negotiations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'agreed'::text, 'rejected'::text, 'closed'::text])))
);


ALTER TABLE public.negotiations OWNER TO postgres;

--
-- Name: orgs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orgs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    country text,
    currency text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orgs_type_check CHECK ((type = ANY (ARRAY['producer'::text, 'client'::text])))
);


ALTER TABLE public.orgs OWNER TO postgres;

--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: project_creatives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_creatives (
    project_id uuid NOT NULL,
    creative_user_id uuid NOT NULL,
    invited_by uuid,
    status text DEFAULT 'invited'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_creatives_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'accepted'::text, 'declined'::text, 'removed'::text])))
);


ALTER TABLE public.project_creatives OWNER TO postgres;

--
-- Name: project_ndas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_ndas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    producer_org_id uuid,
    creative_user_id uuid,
    contact_id uuid,
    participant_type text NOT NULL,
    email text NOT NULL,
    display_name text,
    nda_title text DEFAULT 'Acuerdo de Confidencialidad'::text NOT NULL,
    nda_body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_ndas_participant_type_check CHECK ((participant_type = ANY (ARRAY['creative'::text, 'company'::text]))),
    CONSTRAINT project_ndas_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


ALTER TABLE public.project_ndas OWNER TO postgres;

--
-- Name: project_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    producer_org_id uuid,
    contact_id uuid,
    participant_type text NOT NULL,
    email text NOT NULL,
    display_name text,
    phone text,
    specialty text,
    status text DEFAULT 'invited'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_participants_participant_type_check CHECK ((participant_type = ANY (ARRAY['creative'::text, 'company'::text]))),
    CONSTRAINT project_participants_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'accepted'::text, 'rejected'::text])))
);


ALTER TABLE public.project_participants OWNER TO postgres;

--
-- Name: project_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    producer_org_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    client_name text,
    client_email text,
    currency text DEFAULT 'CLP'::text NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(6,3) DEFAULT 0 NOT NULL,
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    valid_until date,
    notes text,
    terms text,
    public_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_name text,
    attachment_url text,
    attachment_mime_type text
);


ALTER TABLE public.project_quotes OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    producer_org_id uuid,
    client_org_id uuid,
    title text NOT NULL,
    brief text,
    status text DEFAULT 'draft'::text NOT NULL,
    currency text,
    start_date date,
    due_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'shared'::text, 'in_negotiation'::text, 'quoted'::text, 'won'::text, 'lost'::text, 'archived'::text])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: quote_item_cost_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_item_cost_links (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_item_id uuid NOT NULL,
    negotiation_id uuid NOT NULL,
    allocated_cost numeric(12,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.quote_item_cost_links OWNER TO postgres;

--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    qty integer DEFAULT 1 NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total numeric(12,2),
    sort_order integer DEFAULT 0 NOT NULL,
    line_total numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.quote_items OWNER TO postgres;

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    producer_org_id uuid NOT NULL,
    client_org_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    currency text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    org_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_type text,
    display_name text,
    phone text,
    country text,
    website text,
    bio text,
    specialty text,
    portfolio text,
    experience text,
    company_name text,
    tax_id text,
    industry text,
    address text,
    avatar_url text,
    CONSTRAINT users_profile_type_check CHECK ((profile_type = ANY (ARRAY['creative'::text, 'company'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['producer_owner'::text, 'producer_admin'::text, 'producer_member'::text, 'producer_viewer'::text, 'creative'::text, 'client'::text, 'platform_admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: creative_profiles creative_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creative_profiles
    ADD CONSTRAINT creative_profiles_pkey PRIMARY KEY (id);


--
-- Name: creative_profiles creative_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creative_profiles
    ADD CONSTRAINT creative_profiles_user_id_key UNIQUE (user_id);


--
-- Name: negotiation_messages negotiation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_messages
    ADD CONSTRAINT negotiation_messages_pkey PRIMARY KEY (id);


--
-- Name: negotiation_offers negotiation_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_offers
    ADD CONSTRAINT negotiation_offers_pkey PRIMARY KEY (id);


--
-- Name: negotiations negotiations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiations
    ADD CONSTRAINT negotiations_pkey PRIMARY KEY (id);


--
-- Name: negotiations negotiations_project_id_creative_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiations
    ADD CONSTRAINT negotiations_project_id_creative_user_id_key UNIQUE (project_id, creative_user_id);


--
-- Name: orgs orgs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orgs
    ADD CONSTRAINT orgs_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- Name: project_creatives project_creatives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_creatives
    ADD CONSTRAINT project_creatives_pkey PRIMARY KEY (project_id, creative_user_id);


--
-- Name: project_ndas project_ndas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_ndas
    ADD CONSTRAINT project_ndas_pkey PRIMARY KEY (id);


--
-- Name: project_participants project_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_participants
    ADD CONSTRAINT project_participants_pkey PRIMARY KEY (id);


--
-- Name: project_quotes project_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_quotes
    ADD CONSTRAINT project_quotes_pkey PRIMARY KEY (id);


--
-- Name: project_quotes project_quotes_public_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_quotes
    ADD CONSTRAINT project_quotes_public_id_key UNIQUE (public_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quote_item_cost_links quote_item_cost_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_item_cost_links
    ADD CONSTRAINT quote_item_cost_links_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_project_id_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_project_id_version_key UNIQUE (project_id, version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: contacts_owner_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contacts_owner_email_unique ON public.contacts USING btree (owner_user_id, lower(email));


--
-- Name: contacts_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_owner_idx ON public.contacts USING btree (owner_user_id);


--
-- Name: idx_negotiation_messages_neg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_negotiation_messages_neg ON public.negotiation_messages USING btree (negotiation_id, created_at);


--
-- Name: idx_negotiation_offers_neg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_negotiation_offers_neg ON public.negotiation_offers USING btree (negotiation_id, created_at);


--
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token);


--
-- Name: idx_password_resets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_user_id ON public.password_resets USING btree (user_id);


--
-- Name: idx_project_quotes_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_quotes_org ON public.project_quotes USING btree (producer_org_id);


--
-- Name: idx_project_quotes_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_quotes_project ON public.project_quotes USING btree (project_id);


--
-- Name: idx_quote_items_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_quote ON public.quote_items USING btree (quote_id);


--
-- Name: project_ndas_project_email_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX project_ndas_project_email_uidx ON public.project_ndas USING btree (project_id, lower(email));


--
-- Name: project_participants_contact_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_participants_contact_idx ON public.project_participants USING btree (contact_id);


--
-- Name: project_participants_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_participants_owner_idx ON public.project_participants USING btree (producer_org_id);


--
-- Name: project_participants_project_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX project_participants_project_email_unique ON public.project_participants USING btree (project_id, lower(email));


--
-- Name: project_participants_project_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_participants_project_idx ON public.project_participants USING btree (project_id);


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: creative_profiles creative_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creative_profiles
    ADD CONSTRAINT creative_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: negotiation_messages negotiation_messages_negotiation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_messages
    ADD CONSTRAINT negotiation_messages_negotiation_id_fkey FOREIGN KEY (negotiation_id) REFERENCES public.negotiations(id) ON DELETE CASCADE;


--
-- Name: negotiation_messages negotiation_messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_messages
    ADD CONSTRAINT negotiation_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: negotiation_offers negotiation_offers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_offers
    ADD CONSTRAINT negotiation_offers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: negotiation_offers negotiation_offers_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_offers
    ADD CONSTRAINT negotiation_offers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: negotiation_offers negotiation_offers_negotiation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiation_offers
    ADD CONSTRAINT negotiation_offers_negotiation_id_fkey FOREIGN KEY (negotiation_id) REFERENCES public.negotiations(id) ON DELETE CASCADE;


--
-- Name: negotiations negotiations_creative_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiations
    ADD CONSTRAINT negotiations_creative_user_id_fkey FOREIGN KEY (creative_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: negotiations negotiations_producer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiations
    ADD CONSTRAINT negotiations_producer_org_id_fkey FOREIGN KEY (producer_org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: negotiations negotiations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.negotiations
    ADD CONSTRAINT negotiations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_creatives project_creatives_creative_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_creatives
    ADD CONSTRAINT project_creatives_creative_user_id_fkey FOREIGN KEY (creative_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_creatives project_creatives_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_creatives
    ADD CONSTRAINT project_creatives_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: project_creatives project_creatives_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_creatives
    ADD CONSTRAINT project_creatives_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_ndas project_ndas_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_ndas
    ADD CONSTRAINT project_ndas_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: project_ndas project_ndas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_ndas
    ADD CONSTRAINT project_ndas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: project_ndas project_ndas_creative_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_ndas
    ADD CONSTRAINT project_ndas_creative_user_id_fkey FOREIGN KEY (creative_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_ndas project_ndas_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_ndas
    ADD CONSTRAINT project_ndas_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_quotes project_quotes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_quotes
    ADD CONSTRAINT project_quotes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_org_id_fkey FOREIGN KEY (client_org_id) REFERENCES public.orgs(id) ON DELETE SET NULL;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: projects projects_producer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_producer_org_id_fkey FOREIGN KEY (producer_org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: quote_item_cost_links quote_item_cost_links_negotiation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_item_cost_links
    ADD CONSTRAINT quote_item_cost_links_negotiation_id_fkey FOREIGN KEY (negotiation_id) REFERENCES public.negotiations(id) ON DELETE CASCADE;


--
-- Name: quote_item_cost_links quote_item_cost_links_quote_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_item_cost_links
    ADD CONSTRAINT quote_item_cost_links_quote_item_id_fkey FOREIGN KEY (quote_item_id) REFERENCES public.quote_items(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.project_quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_org_id_fkey FOREIGN KEY (client_org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotes quotes_producer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_producer_org_id_fkey FOREIGN KEY (producer_org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

