| table_name           | column_name             | data_type                |
| -------------------- | ----------------------- | ------------------------ |
| unavailable_days     | created_at              | timestamp with time zone |
| children             | parent_id               | uuid                     |
| task_instances       | sequence_id             | uuid                     |
| task_instances       | famcoin_value           | integer                  |
| task_instances       | photo_proof_required    | boolean                  |
| task_instances       | effort_score            | integer                  |
| task_instances       | is_bonus_task           | boolean                  |
| task_instances       | created_at              | timestamp with time zone |
| task_instances       | updated_at              | timestamp with time zone |
| child_sessions       | id                      | uuid                     |
| child_sessions       | child_id                | uuid                     |
| child_sessions       | expires_at              | timestamp with time zone |
| child_sessions       | last_activity           | timestamp with time zone |
| child_sessions       | created_at              | timestamp with time zone |
| famcoin_transactions | id                      | uuid                     |
| famcoin_transactions | child_id                | uuid                     |
| famcoin_transactions | amount                  | integer                  |
| famcoin_transactions | task_completion_id      | uuid                     |
| famcoin_transactions | wishlist_item_id        | uuid                     |
| famcoin_transactions | created_by              | uuid                     |
| famcoin_transactions | created_at              | timestamp with time zone |
| sequences            | id                      | uuid                     |
| sequences            | child_id                | uuid                     |
| sequences            | start_date              | date                     |
| sequences            | end_date                | date                     |
| sequences            | budget_currency         | numeric                  |
| sequences            | budget_famcoins         | integer                  |
| sequences            | created_at              | timestamp with time zone |
| sequences            | updated_at              | timestamp with time zone |
| task_completions     | id                      | uuid                     |
| task_completions     | task_instance_id        | uuid                     |
| task_completions     | child_id                | uuid                     |
| task_completions     | due_date                | date                     |
| task_completions     | completed_at            | timestamp with time zone |
| task_completions     | approved_at             | timestamp with time zone |
| task_completions     | approved_by             | uuid                     |
| task_completions     | famcoins_earned         | integer                  |
| task_completions     | created_at              | timestamp with time zone |
| task_completions     | updated_at              | timestamp with time zone |
| unavailable_days     | id                      | uuid                     |
| unavailable_days     | child_id                | uuid                     |
| unavailable_days     | date                    | date                     |
| unavailable_days     | created_by              | uuid                     |
| children             | id                      | uuid                     |
| children             | age                     | integer                  |
| children             | famcoin_balance         | integer                  |
| children             | created_at              | timestamp with time zone |
| children             | updated_at              | timestamp with time zone |
| profiles             | id                      | uuid                     |
| profiles             | famcoin_conversion_rate | integer                  |
| profiles             | created_at              | timestamp with time zone |
| profiles             | updated_at              | timestamp with time zone |
| task_categories      | id                      | uuid                     |
| task_categories      | is_system               | boolean                  |
| task_categories      | created_at              | timestamp with time zone |
| subscriptions        | id                      | uuid                     |
| subscriptions        | parent_id               | uuid                     |
| subscriptions        | trial_start             | timestamp with time zone |
| subscriptions        | trial_end               | timestamp with time zone |
| subscriptions        | current_period_start    | timestamp with time zone |
| subscriptions        | current_period_end      | timestamp with time zone |
| subscriptions        | created_at              | timestamp with time zone |
| subscriptions        | updated_at              | timestamp with time zone |
| groups               | id                      | uuid                     |
| groups               | sequence_id             | uuid                     |
| groups               | active_days             | ARRAY                    |
| groups               | created_at              | timestamp with time zone |
| groups               | updated_at              | timestamp with time zone |
| connection_tokens    | id                      | uuid                     |
| connection_tokens    | parent_id               | uuid                     |
| connection_tokens    | expires_at              | timestamp with time zone |
| connection_tokens    | used                    | boolean                  |
| connection_tokens    | created_at              | timestamp with time zone |
| wishlist_items       | id                      | uuid                     |
| wishlist_items       | child_id                | uuid                     |
| wishlist_items       | price_currency          | numeric                  |
| wishlist_items       | price_famcoins          | integer                  |
| wishlist_items       | created_at              | timestamp with time zone |
| wishlist_items       | updated_at              | timestamp with time zone |
| task_templates       | id                      | uuid                     |
| task_templates       | category_id             | uuid                     |
| task_templates       | photo_proof_required    | boolean                  |
| task_templates       | effort_score            | integer                  |
| task_templates       | is_system               | boolean                  |
| task_templates       | parent_id               | uuid                     |
| task_templates       | usage_count             | integer                  |
| task_templates       | created_at              | timestamp with time zone |
| task_templates       | updated_at              | timestamp with time zone |
| task_instances       | id                      | uuid                     |
| task_instances       | template_id             | uuid                     |
| task_instances       | group_id                | uuid                     |
| children             | name                    | text                     |
| sequences            | currency_code           | character                |
| children             | avatar_url              | text                     |
| children             | pin_hash                | text                     |
| children             | device_id               | text                     |
| connection_tokens    | token                   | text                     |
| children             | focus_areas             | ARRAY                    |
| connection_tokens    | child_name              | text                     |
| sequences            | status                  | text                     |