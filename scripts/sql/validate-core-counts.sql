select 'ventas' as table_name, count(*) as row_count from ventas
union all select 'clientes', count(*) from clientes
union all select 'gastos', count(*) from gastos
union all select 'cobros', count(*) from cobros
union all select 'productos', count(*) from productos
union all select 'vendedores', count(*) from vendedores
union all select 'user_pins', count(*) from user_pins
union all select 'user_permissions', count(*) from user_permissions
union all select 'app_config', count(*) from app_config
union all select 'klinge_leads', count(*) from klinge_leads
union all select 'leads', count(*) from leads
union all select 'lumi_config', count(*) from lumi_config
union all select 'lumi_productos', count(*) from lumi_productos
union all select 'social_conversaciones', count(*) from social_conversaciones
union all select 'social_mensajes', count(*) from social_mensajes
union all select 'shopify_orders', count(*) from shopify_orders
union all select 'shopify_carts', count(*) from shopify_carts
union all select 'crm_communication_history', count(*) from crm_communication_history
union all select 'crm_message_queue', count(*) from crm_message_queue
order by table_name;
