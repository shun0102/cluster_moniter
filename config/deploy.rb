set :application, "cluster-moniter"
set :scm,         :git
set :repository,  "git://github.com/shun0102/cluster_moniter.git"
set :branch,      "master"
set :deploy_via,  :remote_cache
set :home,        "/home/mikami"
set :deploy_to,   "#{home}/www/#{application}"
set :node_path,   "#{home}/local/node/bin/node"
set :node_script, "server.js"

set :user, "mikami"
set :use_sudo, false
set :default_run_options, :pty => true

role :app, "tsukuba000.intrigger.omni.hpcc.jp"

set :shared_children, %w(log node_modules)

namespace :deploy do
  task :default do
    update
    start
  end

  task :cold do
    update
    start
  end
  
  task :setup, :expect => { :no_release => true } do
    dirs  = [deploy_to, releases_path, shared_path]
    dirs += shared_children.map { |d| File.join(shared_path, d) }
    run "mkdir -p #{dirs.join(' ')}"
    run "chmod g+w #{dirs.join(' ')}" if fetch(:group_writable, true)
  end
  
  task :finalize_update, :except => { :no_release => true } do
    run "chmod -R g+w #{latest_release}" if fetch(:group_writable, true)
    run <<-CMD
      rm -rf #{latest_release}/log #{latest_release}/node_modules &&
      ln -s #{shared_path}/log #{latest_release}/log &&
      ln -s #{shared_path}/node_modules #{latest_release}/node_modules
    CMD
  end
  
  task :start, :roles => :app do
    run "NODE_ENV=production forever start #{deploy_to}/current/#{node_script}"
  end

  task :stop, :roles => :app do
    #TODO
    run "pkill -f node"
  end

  task :restart, :roles => :app do
    stop
    start
  end
  
  task :npm, :roles => :app do
    run <<-CMD
      export PATH=#{node_path}:$PATH &&
      cd #{latest_release} &&
      npm install 
    CMD
  end
  
end

after 'deploy:finalize_update', 'deploy:npm'
